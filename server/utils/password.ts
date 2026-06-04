import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// Self-contained scrypt password hashing so the exact same logic can be reused
// both inside the Nitro server (login) and in the standalone seed scripts run
// with `bun run`. Format: `<saltHex>:<derivedKeyHex>`.

const KEYLEN = 64

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, (err, derivedKey) => {
      if (err) reject(err)
      else resolve(derivedKey)
    })
  })
}

export async function hashUserPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derivedKey = await scryptAsync(password, salt)
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`
}

export async function verifyUserPassword(storedHash: string, password: string): Promise<boolean> {
  const [saltHex, keyHex] = storedHash.split(':')
  if (!saltHex || !keyHex) return false

  const salt = Buffer.from(saltHex, 'hex')
  const storedKey = Buffer.from(keyHex, 'hex')
  const derivedKey = await scryptAsync(password, salt)

  if (storedKey.length !== derivedKey.length) return false
  return timingSafeEqual(storedKey, derivedKey)
}
