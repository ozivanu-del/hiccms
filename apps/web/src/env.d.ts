/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_HOMEPAGE_HERO_BACKGROUND?: string
  readonly PUBLIC_HOMEPAGE_HERO_ACCENT?: string
  readonly PUBLIC_TEMPLATE_HEADER_SIZE?: 'default' | 'large'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
