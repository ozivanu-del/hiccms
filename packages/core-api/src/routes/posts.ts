import { Hono } from 'hono'
import { authMiddleware, JWTPayload } from '../middleware/authMiddleware'
import { findUniquePostSlug, normalizePostSlug } from '../services/unique-slug'
import { runD1WriteWithRetry } from '../services/d1-write'
import { createPostTagStatements } from '../services/post-tags'

const posts = new Hono<{ Bindings: { DB: D1Database }, Variables: { user: JWTPayload } }>()
const editorRoles = ['role-superadmin', 'role-admin', 'role-editor', 'role-author']

// Protected: Get every post visible to the current editor, regardless of publication state.
posts.get('/admin', authMiddleware(editorRoles), async (c) => {
  try {
    const user = c.get('user')
    const columns = `p.id, p.title, p.slug, p.excerpt, p.status, p.visibility, p.published_at, p.view_count,
      p.meta_title, p.meta_description, p.focus_keyword, p.meta_keywords, p.og_image,
      p.category_id, u.name AS author, c.name AS category`
    const statement = user.role === 'role-author'
      ? c.env.DB.prepare(
        `SELECT ${columns} FROM posts p
         LEFT JOIN users u ON p.author_id = u.id
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.author_id = ? ORDER BY p.updated_at DESC`,
      ).bind(user.sub)
      : c.env.DB.prepare(
        `SELECT ${columns} FROM posts p
         LEFT JOIN users u ON p.author_id = u.id
         LEFT JOIN categories c ON p.category_id = c.id
         ORDER BY p.updated_at DESC`,
      )
    const { results } = await statement.all()
    return c.json({ success: true, data: results })
  } catch (error) {
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Unable to load posts' }, 500)
  }
})

// Public: Get all published posts (excluding private)
posts.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.status, p.visibility, p.published_at, p.view_count,
        p.meta_title, p.meta_description, p.focus_keyword, p.meta_keywords, p.og_image,
        p.category_id, u.name as author, c.name as category
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE (p.status = 'published' OR (p.status = 'scheduled' AND datetime(p.published_at) <= CURRENT_TIMESTAMP)) AND p.visibility != 'private'
       ORDER BY p.published_at DESC LIMIT 20`
    ).all()
    return c.json({ success: true, data: results })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

// Protected: Check slug availability (for auto-generate & manual edit)
posts.get('/check-slug/:slug', authMiddleware(['role-superadmin', 'role-admin', 'role-editor', 'role-author']), async (c) => {
  try {
    const slug = c.req.param('slug');
    const normalized = normalizePostSlug(String(slug ?? ''))
    const suggestedSlug = await findUniquePostSlug(c.env.DB, normalized)
    return c.json({ success: true, available: suggestedSlug === normalized, suggestedSlug });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
})

// Protected: Get complete post payload for editing
posts.get('/:id/edit', authMiddleware(['role-superadmin', 'role-admin', 'role-editor', 'role-author']), async (c) => {
  try {
    const id = c.req.param('id')
    const user = c.get('user')
    const post = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first()
    if (!post) return c.json({ success: false, message: 'Post not found' }, 404)
    if (user.role === 'role-author' && post.author_id !== user.sub) {
      return c.json({ success: false, message: 'Forbidden' }, 403)
    }
    const { results: tags } = await c.env.DB.prepare(
      `SELECT t.name FROM tags t
       INNER JOIN post_tags pt ON pt.tag_id = t.id
       WHERE pt.post_id = ? ORDER BY t.name ASC`,
    ).bind(id).all<{ name: string }>()
    return c.json({ success: true, data: { ...post, tags: tags.map((tag) => tag.name) } })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

// Public: Get post by slug
posts.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')
    const { results } = await c.env.DB.prepare(
      `SELECT p.*, u.name as author, c.name as category 
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ? AND (p.status = 'published' OR (p.status = 'scheduled' AND datetime(p.published_at) <= CURRENT_TIMESTAMP)) AND p.visibility != 'private'`
    ).bind(slug).all()
    
    if (results.length === 0) {
      return c.json({ success: false, message: 'Post not found' }, 404)
    }
    
    const post = results[0];

    const countedPost = await c.env.DB.prepare(
      'UPDATE posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ? RETURNING view_count',
    ).bind(post.id).first<{ view_count: number }>()
    post.view_count = countedPost?.view_count ?? Number(post.view_count ?? 0)

    const { results: relatedPosts } = await c.env.DB.prepare(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.og_image, p.view_count, p.published_at, c.name AS category
       FROM posts p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id != ?
         AND (p.status = 'published' OR (p.status = 'scheduled' AND datetime(p.published_at) <= CURRENT_TIMESTAMP))
         AND p.visibility != 'private'
       ORDER BY CASE WHEN p.category_id = ? THEN 0 ELSE 1 END, datetime(p.published_at) DESC
       LIMIT 4`,
    ).bind(post.id, post.category_id ?? '').all()
    post.related_posts = relatedPosts
    
    // If password protected, hide content
    if (post.visibility === 'password') {
      post.content = null; // Content hidden until unlocked
      post.is_locked = true;
    }
    
    return c.json({ success: true, data: post })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

// Protected: Unlock password-protected post
posts.post('/:slug/unlock', async (c) => {
  try {
    const slug = c.req.param('slug')
    const { password } = await c.req.json()
    
    const postRecord = await c.env.DB.prepare(
      `SELECT content, password FROM posts WHERE slug = ? AND visibility = 'password'`
    ).bind(slug).first()
    
    if (!postRecord) return c.json({ success: false, message: 'Post not found' }, 404)
    if (postRecord.password !== password) return c.json({ success: false, message: 'Invalid password' }, 401)
    
    return c.json({ success: true, content: postRecord.content })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

// Protected: Create post
posts.post('/', authMiddleware(['role-superadmin', 'role-admin', 'role-editor', 'role-author']), async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const id = crypto.randomUUID()
    const slug = await findUniquePostSlug(c.env.DB, String(body.slug || body.title || ''))
    
    let publishedAt = body.published_at || null;
    if (body.status === 'scheduled' && !publishedAt) {
      return c.json({ success: false, message: 'Scheduled publication date is required' }, 400)
    }
    if (body.status === 'published' && !publishedAt) {
      publishedAt = new Date().toISOString();
    }
    
    const metaTitle = String(body.meta_title ?? '').trim() || null
    const metaDescription = String(body.meta_description ?? '').trim() || null
    const focusKeyword = String(body.focus_keyword ?? '').trim() || null
    const postStatement = c.env.DB.prepare(
      `INSERT INTO posts (id, title, slug, excerpt, content, status, visibility, password, author_id, category_id, published_at, meta_title, meta_description, focus_keyword, meta_keywords, og_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, body.title, slug, body.excerpt || null, body.content || null, body.status || 'draft', body.visibility || 'public', body.password || null, user.sub, body.category_id || null, publishedAt, metaTitle, metaDescription, focusKeyword, body.meta_keywords || null, body.og_image || null)
    const tagStatements = createPostTagStatements(c.env.DB, id, body.tags)
    await runD1WriteWithRetry(() => c.env.DB.batch([postStatement, ...tagStatements]), 'create-post')

    return c.json({ success: true, message: 'Post created', data: { id, slug } }, 201)
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

// Protected: Update post
posts.put('/:id', authMiddleware(['role-superadmin', 'role-admin', 'role-editor', 'role-author']), async (c) => {
  try {
    const id = String(c.req.param('id'))
    const user = c.get('user')
    const body = await c.req.json()
    
    // Verify author logic
    const oldPost = await c.env.DB.prepare(`SELECT author_id, slug FROM posts WHERE id = ?`).bind(id).first()
    if (!oldPost) return c.json({ success: false, message: 'Not found' }, 404)
    
    if (user.role === 'role-author' && oldPost.author_id !== user.sub) {
      return c.json({ success: false, message: 'Forbidden' }, 403)
    }
    const slug = await findUniquePostSlug(c.env.DB, String(body.slug || body.title || ''), id)

    let publishedAt = body.published_at || null;
    if (body.status === 'scheduled' && !publishedAt) {
      return c.json({ success: false, message: 'Scheduled publication date is required' }, 400)
    }
    if (body.status === 'published' && !publishedAt) {
      publishedAt = new Date().toISOString();
    }
    
    const metaTitle = String(body.meta_title ?? '').trim() || null
    const metaDescription = String(body.meta_description ?? '').trim() || null
    const focusKeyword = String(body.focus_keyword ?? '').trim() || null
    const statements: D1PreparedStatement[] = []
    if (slug !== oldPost.slug) {
      statements.push(c.env.DB.prepare(
        'INSERT INTO redirects (id, old_slug, new_slug) VALUES (?, ?, ?)',
      ).bind(crypto.randomUUID(), oldPost.slug, slug))
    }
    statements.push(c.env.DB.prepare(
      `UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, status = ?, visibility = ?, password = ?, category_id = ?, published_at = ?, meta_title = ?, meta_description = ?, focus_keyword = ?, meta_keywords = ?, og_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
      .bind(body.title, slug, body.excerpt || null, body.content || null, body.status || 'draft', body.visibility || 'public', body.password || null, body.category_id || null, publishedAt, metaTitle, metaDescription, focusKeyword, body.meta_keywords || null, body.og_image || null, id))
    statements.push(c.env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(id))
    statements.push(...createPostTagStatements(c.env.DB, id, body.tags))
    await runD1WriteWithRetry(() => c.env.DB.batch(statements), 'update-post')

    return c.json({ success: true, message: 'Post updated' })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

// Protected: Soft delete post (Archive)
posts.delete('/:id', authMiddleware(['role-superadmin', 'role-admin', 'role-editor', 'role-author']), async (c) => {
  try {
    const id = c.req.param('id')
    const user = c.get('user')
    if (user.role === 'role-author') {
      const oldPost = await c.env.DB.prepare('SELECT author_id FROM posts WHERE id = ?').bind(id).first()
      if (!oldPost || oldPost.author_id !== user.sub) {
        return c.json({ success: false, message: 'Forbidden' }, 403)
      }
    }
    await c.env.DB.prepare("UPDATE posts SET status = 'archived' WHERE id = ?").bind(id).run()
    return c.json({ success: true, message: 'Post archived (soft deleted)' })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

export default posts
