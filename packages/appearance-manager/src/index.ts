export type MenuLocation = 'primary' | 'footer' | 'custom'
export type MenuTarget = '_self' | '_blank'

export interface MenuItem {
  id: string
  menuId: string
  parentId: string | null
  label: string
  url: string
  target: MenuTarget
  sortOrder: number
  isEnabled: boolean
  children: MenuItem[]
}

export interface Menu {
  id: string
  name: string
  slug: string
  location: MenuLocation
  isEnabled: boolean
  items: MenuItem[]
  createdAt: string
  updatedAt: string
}

export interface HeaderConfig {
  menuSlug: string
  showLogo: boolean
  showSiteName: boolean
  sticky: boolean
  ctaLabel: string
  ctaUrl: string
  alignment: 'left' | 'center' | 'space-between'
}

export interface SocialLink { label: string; url: string }

export interface FooterConfig {
  menuSlug: string
  showSiteName: boolean
  description: string
  copyright: string
  columns: 1 | 2 | 3 | 4
  socialLinks: SocialLink[]
}

export interface PublicAppearance {
  menus: Menu[]
  header: HeaderConfig
  footer: FooterConfig
}

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  menuSlug: 'primary', showLogo: true, showSiteName: true, sticky: true,
  ctaLabel: '', ctaUrl: '', alignment: 'space-between',
}

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  menuSlug: 'footer', showSiteName: true, description: '', copyright: '',
  columns: 2, socialLinks: [],
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validateMenuSlug(value: unknown): string {
  if (typeof value !== 'string' || !SLUG_PATTERN.test(value)) throw new Error('Menu slug is invalid')
  return value
}

export function validateMenuUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Menu URL is required')
  const url = value.trim()
  if (url.startsWith('/')) return url
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
    return parsed.toString()
  } catch { throw new Error('Menu URL must be relative or use HTTP/HTTPS') }
}

export function parseHeaderConfig(value: unknown): HeaderConfig {
  if (!value || typeof value !== 'object') throw new Error('Header config must be an object')
  const input = value as Partial<HeaderConfig>
  if (!['left', 'center', 'space-between'].includes(String(input.alignment))) throw new Error('Header alignment is invalid')
  return {
    menuSlug: validateMenuSlug(input.menuSlug),
    showLogo: Boolean(input.showLogo), showSiteName: Boolean(input.showSiteName), sticky: Boolean(input.sticky),
    ctaLabel: String(input.ctaLabel ?? ''), ctaUrl: input.ctaUrl ? validateMenuUrl(input.ctaUrl) : '',
    alignment: input.alignment as HeaderConfig['alignment'],
  }
}

export function parseFooterConfig(value: unknown): FooterConfig {
  if (!value || typeof value !== 'object') throw new Error('Footer config must be an object')
  const input = value as Partial<FooterConfig>
  const columns = Number(input.columns)
  if (![1, 2, 3, 4].includes(columns)) throw new Error('Footer columns must be between 1 and 4')
  return {
    menuSlug: validateMenuSlug(input.menuSlug), showSiteName: Boolean(input.showSiteName),
    description: String(input.description ?? ''), copyright: String(input.copyright ?? ''),
    columns: columns as FooterConfig['columns'],
    socialLinks: Array.isArray(input.socialLinks) ? input.socialLinks.map((link) => ({
      label: String(link.label ?? ''), url: validateMenuUrl(link.url),
    })) : [],
  }
}
