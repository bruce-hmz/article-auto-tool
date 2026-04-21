import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAccountById } from '@/lib/db/queries/accounts'
import { getBriefByAccountId, upsertBrief } from '@/lib/db/queries/briefs'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify account belongs to user
    const account = await getAccountById(params.accountId, session.user.id)
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const brief = await getBriefByAccountId(params.accountId)
    if (!brief) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      ...brief,
      topicDomains: brief.topicDomains ? JSON.parse(brief.topicDomains) : null,
      promptOverrides: brief.promptOverrides ? JSON.parse(brief.promptOverrides) : null,
    })
  } catch (error) {
    console.error('Failed to get brief:', error)
    return NextResponse.json({ error: 'Failed to get brief' }, { status: 500 })
  }
}

const briefSchema = z.object({
  voice: z.string().optional(),
  audience: z.string().optional(),
  tone: z.enum(['formal', 'casual', 'mixed']).optional(),
  topicDomains: z.object({
    include: z.array(z.string()),
    exclude: z.array(z.string()),
  }).optional(),
  promptOverrides: z.record(z.string(), z.unknown()).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify account belongs to user
    const account = await getAccountById(params.accountId, session.user.id)
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = briefSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const brief = await upsertBrief(params.accountId, parsed.data)
    return NextResponse.json({
      ...brief,
      topicDomains: brief!.topicDomains ? JSON.parse(brief!.topicDomains) : null,
      promptOverrides: brief!.promptOverrides ? JSON.parse(brief!.promptOverrides) : null,
    })
  } catch (error) {
    console.error('Failed to update brief:', error)
    return NextResponse.json({ error: 'Failed to update brief' }, { status: 500 })
  }
}
