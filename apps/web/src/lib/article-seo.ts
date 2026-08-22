interface ArticleSeoInput {
  title: string
  excerpt?: string | null
  meta_title?: string | null
  meta_description?: string | null
}

export function resolveArticleSeo(input: ArticleSeoInput) {
  return {
    title: String(input.meta_title ?? '').trim() || input.title,
    description: String(input.meta_description ?? '').trim() || String(input.excerpt ?? ''),
  }
}
