export type PageStatus = 'draft' | 'published' | 'archived'
export type PageTemplate = 'default' | 'full-width' | 'landing'

export interface PageSummary {
  id: string
  title: string
  slug: string
  excerpt: string
  status: PageStatus
  template: PageTemplate
  featuredImage: string
  isHomepage: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Page extends PageSummary {
  content: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  authorId: string
}

export interface PageInput {
  title: string
  slug: string
  excerpt: string
  content: string
  status: PageStatus
  template: PageTemplate
  featuredImage: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  isHomepage: boolean
  publishedAt: string | null
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function parsePageInput(value: unknown): PageInput {
  if (!value || typeof value !== 'object') throw new Error('Page payload must be an object')
  const input = value as Partial<PageInput>
  const title = String(input.title ?? '').trim()
  const slug = String(input.slug ?? '').trim().toLowerCase()
  const status = String(input.status ?? 'draft')
  const template = String(input.template ?? 'default')
  if (!title) throw new Error('Page title is required')
  if (!SLUG_PATTERN.test(slug)) throw new Error('Page slug is invalid')
  if (!['draft', 'published', 'archived'].includes(status)) throw new Error('Page status is invalid')
  if (!['default', 'full-width', 'landing'].includes(template)) throw new Error('Page template is invalid')
  if (input.isHomepage && status !== 'published') throw new Error('Homepage must be published')
  return {
    title,
    slug,
    excerpt: String(input.excerpt ?? ''),
    content: String(input.content ?? ''),
    status: status as PageStatus,
    template: template as PageTemplate,
    featuredImage: String(input.featuredImage ?? '').trim(),
    metaTitle: String(input.metaTitle ?? '').trim(),
    metaDescription: String(input.metaDescription ?? '').trim(),
    metaKeywords: String(input.metaKeywords ?? '').trim(),
    isHomepage: Boolean(input.isHomepage),
    publishedAt: input.publishedAt ? String(input.publishedAt) : null,
  }
}
