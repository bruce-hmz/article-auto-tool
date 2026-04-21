import { eq, and } from 'drizzle-orm'
import { wechatAccounts } from '../schema'
import { getDb } from '../index'
import { v4 as uuid } from 'uuid'
import { encrypt, decrypt } from '../crypto'

export async function getAccountsByUserId(userId: string) {
  const db = getDb()
  return db.select().from(wechatAccounts).where(eq(wechatAccounts.userId, userId))
}

export async function getAccountById(accountId: string, userId: string) {
  const db = getDb()
  const result = await db.select().from(wechatAccounts)
    .where(and(eq(wechatAccounts.id, accountId), eq(wechatAccounts.userId, userId)))
    .limit(1)
  return result[0] ?? null
}

export async function createAccount(userId: string, data: {
  name: string
  appId: string
  appSecret: string
  config?: Record<string, unknown>
}) {
  const db = getDb()
  const id = uuid()
  const encryptedSecret = encrypt(data.appSecret)
  await db.insert(wechatAccounts).values({
    id,
    userId,
    name: data.name,
    appId: data.appId,
    appSecret: encryptedSecret,
    config: data.config ? JSON.stringify(data.config) : null,
  })
  return getAccountById(id, userId)
}

export async function updateAccount(accountId: string, userId: string, data: {
  name?: string
  appId?: string
  appSecret?: string
  config?: Record<string, unknown>
}) {
  const db = getDb()
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (data.name !== undefined) updates.name = data.name
  if (data.appId !== undefined) updates.appId = data.appId
  if (data.appSecret !== undefined) updates.appSecret = encrypt(data.appSecret)
  if (data.config !== undefined) updates.config = JSON.stringify(data.config)

  await db.update(wechatAccounts)
    .set(updates)
    .where(and(eq(wechatAccounts.id, accountId), eq(wechatAccounts.userId, userId)))
  return getAccountById(accountId, userId)
}

export async function deleteAccount(accountId: string, userId: string) {
  const db = getDb()
  await db.delete(wechatAccounts)
    .where(and(eq(wechatAccounts.id, accountId), eq(wechatAccounts.userId, userId)))
}

export function decryptAccountSecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret)
}

export function maskAppId(appId: string): string {
  if (appId.length <= 8) return '****'
  return appId.slice(0, 4) + '****' + appId.slice(-4)
}

export function maskAppSecret(secret: string): string {
  return '****' + secret.slice(-4)
}
