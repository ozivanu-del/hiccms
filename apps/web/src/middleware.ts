import { defineMiddleware } from 'astro:middleware'
import { SITE_URL } from './lib/site'

export const onRequest = defineMiddleware(({ request }, next) => {
  const url = new URL(request.url)
  const canonical = new URL(SITE_URL)
  if (url.hostname === `www.${canonical.hostname}`) {
    url.hostname = canonical.hostname
    return Response.redirect(url, 301)
  }
  return next()
})
