import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://hiccms.com',
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
    routes: { extend: { exclude: [{ pattern: '/_image' }] } },
  }),
  integrations: [tailwind()]
});
