export const PLUGIN_CAPABILITIES = [
  'content.read',
  'content.write',
  'media.read',
  'media.write',
  'settings.read',
  'settings.write',
  'automation.execute',
  'appearance.manage',
] as const

export type PluginCapability = typeof PLUGIN_CAPABILITIES[number]
export type PluginStatus = 'inactive' | 'active'

export const HICCMS_VERSION = '1.2.0'
export const PLUGIN_HOOKS = [
  'content.beforeSave',
  'content.afterSave',
  'content.beforePublish',
  'content.afterPublish',
  'media.afterUpload',
  'automation.afterJob',
] as const

export type PluginHook = typeof PLUGIN_HOOKS[number]
export type PluginConfigFieldType = 'string' | 'number' | 'boolean'

export interface PluginConfigField {
  type: PluginConfigFieldType
  label: string
  required?: boolean
  default?: string | number | boolean
}

export interface PluginManifest {
  slug: string
  name: string
  version: string
  description: string
  author: string
  capabilities: PluginCapability[]
  hooks: PluginHook[]
  hiccms: { minVersion: string; maxVersion?: string }
  configSchema: Record<string, PluginConfigField>
}

export interface InstalledPlugin extends PluginManifest {
  id: string
  status: PluginStatus
  installedAt: string
  activatedAt: string | null
  updatedAt: string
}

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function compareVersions(left: string, right: string): number {
  const a = left.split('-')[0].split('.').map(Number)
  const b = right.split('-')[0].split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1
  }
  return 0
}

export function isPluginCompatible(manifest: PluginManifest, cmsVersion = HICCMS_VERSION): boolean {
  return compareVersions(cmsVersion, manifest.hiccms.minVersion) >= 0
    && (!manifest.hiccms.maxVersion || compareVersions(cmsVersion, manifest.hiccms.maxVersion) <= 0)
}

export function parsePluginConfig(manifest: PluginManifest, value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Konfigurasi plugin tidak valid')
  const input = value as Record<string, unknown>
  const unknownKey = Object.keys(input).find((key) => !manifest.configSchema[key])
  if (unknownKey) throw new Error(`Konfigurasi tidak dikenal: ${unknownKey}`)
  const output: Record<string, string | number | boolean> = {}
  for (const [key, field] of Object.entries(manifest.configSchema)) {
    const item = input[key] ?? field.default
    if (item === undefined) {
      if (field.required) throw new Error(`Konfigurasi ${key} wajib diisi`)
      continue
    }
    if (typeof item !== field.type) throw new Error(`Tipe konfigurasi ${key} harus ${field.type}`)
    output[key] = item as string | number | boolean
  }
  return output
}

export function parsePluginManifest(value: unknown): PluginManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Manifest plugin tidak valid')
  const input = value as Record<string, unknown>
  const slug = typeof input.slug === 'string' ? input.slug.trim() : ''
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const version = typeof input.version === 'string' ? input.version.trim() : ''
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  const author = typeof input.author === 'string' ? input.author.trim() : ''
  if (!SLUG_PATTERN.test(slug) || slug.length > 80) throw new Error('Slug plugin tidak valid')
  if (!name || name.length > 120) throw new Error('Nama plugin wajib diisi dan maksimal 120 karakter')
  if (!VERSION_PATTERN.test(version)) throw new Error('Versi plugin harus menggunakan format semver, misalnya 1.0.0')
  if (!author || author.length > 120) throw new Error('Author plugin wajib diisi')
  if (description.length > 500) throw new Error('Deskripsi plugin maksimal 500 karakter')
  const rawCapabilities = Array.isArray(input.capabilities) ? input.capabilities : []
  const capabilities = [...new Set(rawCapabilities)]
  if (!capabilities.every((item): item is PluginCapability => typeof item === 'string' && PLUGIN_CAPABILITIES.includes(item as PluginCapability))) {
    throw new Error('Manifest berisi capability yang tidak didukung')
  }
  const rawHooks = Array.isArray(input.hooks) ? input.hooks : []
  const hooks = [...new Set(rawHooks)]
  if (!hooks.every((item): item is PluginHook => typeof item === 'string' && PLUGIN_HOOKS.includes(item as PluginHook))) {
    throw new Error('Manifest berisi hook yang tidak didukung')
  }
  const compatibility = input.hiccms && typeof input.hiccms === 'object' && !Array.isArray(input.hiccms)
    ? input.hiccms as Record<string, unknown> : {}
  const minVersion = typeof compatibility.minVersion === 'string' ? compatibility.minVersion : HICCMS_VERSION
  const maxVersion = typeof compatibility.maxVersion === 'string' ? compatibility.maxVersion : undefined
  if (!VERSION_PATTERN.test(minVersion) || (maxVersion && !VERSION_PATTERN.test(maxVersion))) throw new Error('Versi kompatibilitas HIC-CMS tidak valid')
  if (maxVersion && compareVersions(minVersion, maxVersion) > 0) throw new Error('Versi minimum tidak boleh melebihi versi maksimum')
  const rawSchema = input.configSchema === undefined ? {} : input.configSchema
  if (!rawSchema || typeof rawSchema !== 'object' || Array.isArray(rawSchema)) throw new Error('Schema konfigurasi plugin tidak valid')
  const configSchema: Record<string, PluginConfigField> = {}
  for (const [key, rawField] of Object.entries(rawSchema as Record<string, unknown>)) {
    if (!SLUG_PATTERN.test(key) || !rawField || typeof rawField !== 'object' || Array.isArray(rawField)) throw new Error(`Field konfigurasi ${key} tidak valid`)
    const field = rawField as Record<string, unknown>
    if (!['string', 'number', 'boolean'].includes(String(field.type)) || typeof field.label !== 'string' || !field.label.trim()) throw new Error(`Schema konfigurasi ${key} tidak valid`)
    configSchema[key] = { type: field.type as PluginConfigFieldType, label: field.label.trim(), ...(field.required === true ? { required: true } : {}), ...(field.default !== undefined ? { default: field.default as string | number | boolean } : {}) }
  }
  return { slug, name, version, description, author, capabilities, hooks, hiccms: { minVersion, ...(maxVersion ? { maxVersion } : {}) }, configSchema }
}
