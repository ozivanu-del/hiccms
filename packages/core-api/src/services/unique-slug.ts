const MAX_SLUG_LENGTH = 60

export const normalizePostSlug = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, MAX_SLUG_LENGTH).replace(/-$/g, '')

export const findUniquePostSlug = async (db: D1Database, requested: string, excludeId?: string): Promise<string> => {
  const base = normalizePostSlug(requested)
  if (!base) throw new Error('A valid slug is required')
  for (let suffix = 1; suffix <= 999; suffix += 1) {
    const ending = suffix === 1 ? '' : `-${suffix}`
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - ending.length).replace(/-$/g, '')}${ending}`
    const existing = excludeId
      ? await db.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?').bind(candidate, excludeId).first()
      : await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(candidate).first()
    if (!existing) return candidate
  }
  throw new Error('Unable to allocate a unique slug')
}
