const configuredSiteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:4321'

export const SITE_URL = new URL(configuredSiteUrl).origin
export const SITE_NAME = import.meta.env.PUBLIC_SITE_NAME ?? 'HIC-CMS'
export const SITE_LANGUAGE = import.meta.env.PUBLIC_SITE_LANGUAGE ?? 'id-ID'
const inferredSchoolSite = /^(ra|tk|sd|smp|sma|smk|mi|mts|ma)\b/i.test(SITE_NAME.trim())
export const SITE_KIND = import.meta.env.PUBLIC_SITE_KIND ?? (inferredSchoolSite ? 'school' : 'cms')

