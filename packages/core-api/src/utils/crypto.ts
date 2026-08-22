/**
 * Hashing utility using Web Crypto API
 * Safe and fast for Cloudflare Workers
 */

// Generate a random salt
export function generateSalt(length = 16): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Hash password with salt using PBKDF2 and SHA-256
export async function hashPassword(password: string, salt?: string): Promise<string> {
  const actualSalt = salt || generateSalt()
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(actualSalt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )

  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  
  return `${actualSalt}:${hashHex}`
}

// Verify password
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, originalHashHex] = storedHash.split(':')
  if (!salt || !originalHashHex) return false
  
  const attemptHash = await hashPassword(password, salt)
  return attemptHash === storedHash
}

export function validatePassword(password: unknown): string | undefined {
  if (typeof password !== 'string' || !password) return 'Password baru wajib diisi'
  if (password.length < 12) return 'Password baru minimal 12 karakter'
  if (password.length > 128) return 'Password maksimal 128 karakter'
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'Password baru harus memuat huruf kecil, huruf besar, dan angka'
  }
  return undefined
}

export function generateSecureToken(length = 32): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
