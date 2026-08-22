import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authRoute from './routes/auth'
import categoriesRoute from './routes/categories'
import postsRoute from './routes/posts'
import mediaRoute from './routes/media'
import settingsRoute from './routes/settings'
import themesRoute from './routes/themes'
import navigationRoute from './routes/navigation'
import pagesRoute from './routes/pages'
import seoRoute from './routes/seo'
import pluginsRoute from './routes/plugins'
import { runScheduledMaintenance } from './worker/scheduled'
import type { WorkerBindings } from './env'
import { resolveAllowedOrigin } from './config'

const app = new Hono<{ Bindings: WorkerBindings }>()

// Enable CORS for all routes (Allowing the React Dashboard to communicate)
app.use('/*', cors({
  origin: (origin, c) => resolveAllowedOrigin(origin, c.env),
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Welcome to HICCMS Core API',
    version: '1.2.0'
  })
})

app.get('/api/health', async (c) => {
  try {
    // Check DB connection
    await c.env.DB.prepare('SELECT 1').run()
    
    return c.json({
      success: true,
      message: 'API is healthy, Database connected'
    })
  } catch (error: any) {
    return c.json({
      success: false,
      message: 'API is healthy, but Database connection failed',
      error: error.message
    }, 500)
  }
})

import redirectsRoute from './routes/redirects'

// Register Routes
app.route('/api/auth', authRoute)
app.route('/api/categories', categoriesRoute)
app.route('/api/posts', postsRoute)
app.route('/api/media', mediaRoute)
app.route('/api/settings', settingsRoute)
app.route('/api/themes', themesRoute)
app.route('/api/redirects', redirectsRoute)
app.route('/api/navigation', navigationRoute)
app.route('/api/pages', pagesRoute)
app.route('/api/plugins', pluginsRoute)
app.route('/api/seo', seoRoute)

export default {
  fetch: app.fetch,
  scheduled: async (_controller: ScheduledController, env: WorkerBindings, ctx: ExecutionContext) => {
    ctx.waitUntil(runScheduledMaintenance(env))
  },
}
