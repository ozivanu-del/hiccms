export const THEME_MODES = ['light', 'dark', 'system'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export interface ThemeFont {
  family: string
  source: 'system' | 'google' | 'custom'
  url?: string
}

export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  foreground: string
}

export interface ThemeConfig {
  mode: ThemeMode
  colors: ThemeColors
  font: ThemeFont
  customCss: string
  customJavaScript: string
}

export interface ThemeManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  preview?: string
  config: ThemeConfig
}

export interface ThemeSummary extends ThemeManifest {
  isActive: boolean
  updatedAt: string
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  mode: 'light',
  colors: {
    primary: '#2563eb', secondary: '#7e3af2',
    background: '#f9fafb', foreground: '#111827',
  },
  font: {
    family: 'Inter', source: 'google',
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
  customCss: '', customJavaScript: '',
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const THEME_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isThemeId(value: string): boolean {
  return THEME_ID_PATTERN.test(value)
}

export function parseThemeConfig(value: unknown): ThemeConfig {
  if (!value || typeof value !== 'object') throw new Error('Theme config must be an object')

  const input = value as Partial<ThemeConfig>
  const colors = input.colors as Partial<ThemeColors> | undefined
  const font = input.font as Partial<ThemeFont> | undefined

  if (!THEME_MODES.includes(input.mode as ThemeMode)) {
    throw new Error('Theme mode must be light, dark, or system')
  }
  if (!colors || !colors.primary || !colors.secondary || !colors.background || !colors.foreground) {
    throw new Error('Theme config must define all colors')
  }
  for (const [name, color] of Object.entries(colors)) {
    if (!HEX_COLOR_PATTERN.test(String(color))) {
      throw new Error(`Theme color ${name} must use six-digit hex format`)
    }
  }
  if (!font?.family || !['system', 'google', 'custom'].includes(String(font.source))) {
    throw new Error('Theme font is invalid')
  }
  if (font.url && !/^https:\/\//i.test(font.url)) {
    throw new Error('Theme font URL must use HTTPS')
  }
  if (typeof input.customCss !== 'string' || typeof input.customJavaScript !== 'string') {
    throw new Error('Custom CSS and JavaScript must be strings')
  }

  return {
    mode: input.mode as ThemeMode,
    colors: colors as ThemeColors,
    font: font as ThemeFont,
    customCss: input.customCss,
    customJavaScript: input.customJavaScript,
  }
}

export function parseStoredThemeConfig(value: string): ThemeConfig {
  return parseThemeConfig(JSON.parse(value))
}
