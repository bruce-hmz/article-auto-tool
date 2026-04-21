import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  return scryptSync(encryptionKey, 'salt', 32)
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: iv:authTag:encrypted (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(':')
  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error('Invalid ciphertext format')
  }
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString('base64')
}
