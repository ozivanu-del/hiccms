const MAX_POST_TAGS = 20
const MAX_TAG_LENGTH = 100

interface NormalizedPostTag {
  name: string
  slug: string
}

const normalizeTagSlug = (value: string): string => value
  .toLocaleLowerCase('id-ID')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, MAX_TAG_LENGTH)
  .replace(/-$/g, '')

export const normalizePostTags = (value: unknown): NormalizedPostTag[] => {
  if (!Array.isArray(value)) return []
  const tags = new Map<string, NormalizedPostTag>()
  for (const item of value) {
    const name = String(item ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH)
    const slug = normalizeTagSlug(name)
    if (name && slug && !tags.has(slug)) tags.set(slug, { name, slug })
    if (tags.size === MAX_POST_TAGS) break
  }
  return [...tags.values()]
}

export const createPostTagStatements = (
  db: D1Database,
  postId: string,
  value: unknown,
): D1PreparedStatement[] => normalizePostTags(value).flatMap(({ name, slug }) => [
  db.prepare('INSERT OR IGNORE INTO tags (id, name, slug) VALUES (?, ?, ?)').bind(crypto.randomUUID(), name, slug),
  db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) SELECT ?, id FROM tags WHERE slug = ?').bind(postId, slug),
])
