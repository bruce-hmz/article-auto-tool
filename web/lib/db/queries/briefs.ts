import { eq } from 'drizzle-orm'
import { editorialBriefs } from '../schema'
import { getDb } from '../index'
import { v4 as uuid } from 'uuid'

export async function getBriefByAccountId(accountId: string) {
  const db = getDb()
  const result = await db.select().from(editorialBriefs)
    .where(eq(editorialBriefs.accountId, accountId))
    .limit(1)
  return result[0] ?? null
}

export async function deleteBrief(accountId: string) {
  const db = getDb()
  await db.delete(editorialBriefs).where(eq(editorialBriefs.accountId, accountId))
}

export async function upsertBrief(accountId: string, data: {
  voice?: string
  audience?: string
  tone?: string
  topicDomains?: { include: string[]; exclude: string[] }
  promptOverrides?: Record<string, unknown>
}) {
  const db = getDb()
  const existing = await getBriefByAccountId(accountId)

  const values = {
    voice: data.voice ?? null,
    audience: data.audience ?? null,
    tone: data.tone ?? null,
    topicDomains: data.topicDomains ? JSON.stringify(data.topicDomains) : null,
    promptOverrides: data.promptOverrides ? JSON.stringify(data.promptOverrides) : null,
    updatedAt: new Date(),
  }

  if (existing) {
    await db.update(editorialBriefs).set(values).where(eq(editorialBriefs.id, existing.id))
    return getBriefByAccountId(accountId)
  } else {
    const id = uuid()
    await db.insert(editorialBriefs).values({
      id,
      accountId,
      ...values,
      createdAt: new Date(),
    })
    return getBriefByAccountId(accountId)
  }
}
