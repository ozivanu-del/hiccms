const RESEND_ENDPOINT = 'https://api.resend.com/emails'
export async function sendPasswordResetEmail(
  apiKey: string,
  recipient: string,
  resetUrl: string,
  branding: { siteName: string; from: string },
): Promise<string | undefined> {
  const normalizedApiKey = apiKey.replace(/[\u0000-\u0020\u007f]/g, '')
  const sanitizedApiKey = normalizedApiKey.match(/re_[A-Za-z0-9_-]+/)?.[0]
  if (!sanitizedApiKey) {
    throw new Error('RESEND_API_KEY format is invalid')
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sanitizedApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: branding.from,
      to: [recipient],
      subject: `Atur ulang password ${branding.siteName}`,
      html: renderResetEmail(resetUrl, branding.siteName),
      text: `Kami menerima permintaan untuk mengatur ulang password ${branding.siteName}. Buka tautan berikut dalam 30 menit:\n\n${resetUrl}\n\nJika Anda tidak meminta perubahan ini, abaikan email ini.`,
    }),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500)
    throw new Error(`Resend request failed (${response.status}): ${detail}`)
  }

  const result: { id?: unknown } = await response.json<{ id?: unknown }>().catch(() => ({}))
  return typeof result.id === 'string' ? result.id : undefined
}

function renderResetEmail(resetUrl: string, siteName: string): string {
  return `<!doctype html>
<html lang="id">
  <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px">
      <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
        <h1 style="font-size:22px;margin:0 0 16px">Atur ulang password ${escapeHtml(siteName)}</h1>
        <p style="line-height:1.6;margin:0 0 24px">Kami menerima permintaan untuk mengatur ulang password akun Anda. Tautan ini berlaku selama 30 menit dan hanya dapat digunakan satu kali.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">Buat Password Baru</a>
        <p style="line-height:1.6;color:#6b7280;font-size:13px;margin:24px 0 0">Jika Anda tidak meminta perubahan ini, abaikan email ini. Password Anda tidak akan berubah.</p>
      </div>
    </div>
  </body>
</html>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] ?? character)
}
