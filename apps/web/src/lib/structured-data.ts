export type StructuredData = Record<string, unknown>
import { SITE_LANGUAGE, SITE_NAME, SITE_URL } from './site'
const ORGANIZATION_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

export function organizationStructuredData(name: string, description: string): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name,
    alternateName: SITE_NAME,
    url: `${SITE_URL}/`,
    description,
  }
}

export function websiteStructuredData(name: string, description: string): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name,
    alternateName: SITE_NAME,
    url: `${SITE_URL}/`,
    description,
    inLanguage: SITE_LANGUAGE,
    publisher: { '@id': ORGANIZATION_ID },
  }
}

export function breadcrumbStructuredData(items: Array<{ name: string; path: string }>): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, SITE_URL).href,
    })),
  }
}

interface ArticleStructuredDataInput {
  title: string
  description?: string
  slug: string
  author?: string
  publishedAt?: string
  updatedAt?: string
  image?: string
  category?: string
  keywords?: string
}

export function articleStructuredData(input: ArticleStructuredDataInput): StructuredData {
  const url = new URL(`/blog/${encodeURIComponent(input.slug)}`, SITE_URL).href
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: input.title,
    description: input.description,
    url,
    image: input.image ? [input.image] : undefined,
    datePublished: input.publishedAt,
    dateModified: input.updatedAt || input.publishedAt,
    author: {
      '@type': 'Person',
      name: input.author || `Tim ${SITE_NAME}`,
    },
    publisher: { '@id': ORGANIZATION_ID },
    articleSection: input.category,
    keywords: input.keywords,
    inLanguage: SITE_LANGUAGE,
  }
}
