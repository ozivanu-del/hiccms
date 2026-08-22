const INDONESIAN_STOP_WORDS = new Set([
  'adalah', 'agar', 'akan', 'atau', 'bagi', 'cara', 'dalam', 'dan', 'dari', 'dengan',
  'di', 'ini', 'itu', 'ke', 'lengkap', 'mudah', 'pada', 'sebagai', 'tentang', 'untuk', 'yang',
])

export const SEO_SLUG_MAX_LENGTH = 60
export const SEO_SLUG_MAX_WORDS = 6

const wordsFrom = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .split(/\s+/)
  .filter(Boolean)

export const createSeoSlug = (value: string): string => {
  const words = wordsFrom(value)
  const meaningful = words.filter((word) => !INDONESIAN_STOP_WORDS.has(word))
  const candidates = (meaningful.length ? meaningful : words).slice(0, SEO_SLUG_MAX_WORDS)
  const selected: string[] = []
  for (const word of candidates) {
    const next = [...selected, word].join('-')
    if (next.length > SEO_SLUG_MAX_LENGTH) break
    selected.push(word)
  }
  if (selected.length) return selected.join('-')
  return candidates[0]?.slice(0, SEO_SLUG_MAX_LENGTH) ?? ''
}

export const normalizeSeoSlug = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, SEO_SLUG_MAX_LENGTH).replace(/-$/g, '')
