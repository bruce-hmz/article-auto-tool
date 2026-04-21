import { eq } from 'drizzle-orm'
import { users } from '../schema'
import { getDb } from '../index'
import { v4 as uuid } from 'uuid'

export async function getUserByEmail(email: string) {
  const db = getDb()
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return result[0] ?? null
}

export async function getUserById(id: string) {
  const db = getDb()
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return result[0] ?? null
}

export async function createUser(email: string, passwordHash: string, name?: string) {
  const db = getDb()
  const id = uuid()
  await db.insert(users).values({ id, email, passwordHash, name })
  return getUserById(id)
}
