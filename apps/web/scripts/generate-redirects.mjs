import fs from 'fs'
import path from 'path'

async function generateRedirects() {
  let redirects = ''
  try {
    const apiUrl = process.env.PUBLIC_API_URL || 'http://localhost:8787'
    const response = await fetch(`${apiUrl}/api/redirects`)
    const result = await response.json()
    if (result.success && Array.isArray(result.data)) {
      redirects = result.data.map((item) => `/blog/${item.old_slug} /blog/${item.new_slug} 301`).join('\n')
    }
  } catch (error) {
    console.warn('Unable to refresh post redirects; generating an empty redirect list.', error)
  }

  const publicPath = path.resolve('public')
  if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true })
  const generatedContent = ['# Auto-generated redirects for posts', redirects].filter(Boolean).join('\n')
  fs.writeFileSync(path.resolve(publicPath, '_redirects'), `${generatedContent}\n`)
  console.log('Redirect file generated successfully')
}

await generateRedirects()
