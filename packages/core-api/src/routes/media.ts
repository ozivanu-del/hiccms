import { Hono } from 'hono'
import { authMiddleware, type JWTPayload } from '../middleware/authMiddleware'

const app = new Hono<{ Bindings: { DB: D1Database, STORAGE: R2Bucket }, Variables: { user: JWTPayload } }>()

// Fetch all media
app.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, filename, original_name, url, mime_type, size, created_at FROM media ORDER BY created_at DESC'
    ).all()
    
    return c.json({ success: true, data: results })
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500)
  }
})

// Upload media
app.post('/upload', authMiddleware(), async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file']
    
    if (!file || typeof file === 'string') {
      return c.json({ success: false, message: 'File is required' }, 400)
    }

    const user = c.get('user')
    const fileId = crypto.randomUUID()
    const ext = file.name.split('.').pop()
    const filename = `${fileId}.${ext}`
    
    // Store in R2
    await c.env.STORAGE.put(filename, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    })
    
    const url = `/api/media/file/${filename}` // Virtual route to serve R2 file

    // Save metadata to D1
    await c.env.DB.prepare(
      'INSERT INTO media (id, filename, original_name, mime_type, size, url, uploader_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(fileId, filename, file.name, file.type, file.size, url, user.sub).run()

    return c.json({ 
      success: true, 
      message: 'File uploaded successfully',
      data: { id: fileId, url, original_name: file.name }
    })
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500)
  }
})

// Serve media file from R2
app.get('/file/:filename', async (c) => {
  const filename = c.req.param('filename')
  const object = await c.env.STORAGE.get(filename)
  
  if (!object) {
    return c.text('Not Found', 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers as any)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  return new Response(object.body as any, { headers })
})

export default app
