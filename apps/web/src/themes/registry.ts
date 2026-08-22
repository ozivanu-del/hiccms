import { parseThemeConfig, type ThemeManifest } from '@hiccms/theme-engine'
import trainerProManifest from './trainer-pro/theme.json'

function parseManifest(value: typeof trainerProManifest): ThemeManifest {
  return {
    id: value.id,
    name: value.name,
    version: value.version,
    description: value.description,
    author: value.author,
    config: parseThemeConfig(value.config),
  }
}

export const themeManifests = {
  'trainer-pro': parseManifest(trainerProManifest),
} satisfies Record<string, ThemeManifest>

export type InstalledThemeId = keyof typeof themeManifests

export function getThemeManifest(id: string): ThemeManifest {
  return themeManifests[id as InstalledThemeId] ?? themeManifests['trainer-pro']
}
