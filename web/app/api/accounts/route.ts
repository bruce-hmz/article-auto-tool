import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAccountsByUserId, createAccount, maskAppId } from '@/lib/db/queries/accounts'
import { getBriefByAccountId } from '@/lib/db/queries/briefs'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await getAccountsByUserId(session.user.id)
    const safeAccounts = await Promise.all(accounts.map(async (account) => {
      const brief = await getBriefByAccountId(account.id)
      return {
        id: account.id,
        name: account.name,
        appId: maskAppId(account.appId),
        fullAppId: account.appId,
        hasAppSecret: true,
        hasBrief: !!brief,
        config: account.config ? JSON.parse(account.config) : null,
        createdAt: account.createdAt,
      }
    }))

    return NextResponse.json(safeAccounts)
  } catch (error) {
    console.error('Failed to list accounts:', error)
    return NextResponse.json({ error: 'Failed to list accounts' }, { status: 500 })
  }
}

const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  appId: z.string().min(1, 'App ID is required'),
  appSecret: z.string().min(1, 'App Secret is required'),
  config: z.object({
    defaultTheme: z.string().optional(),
    imageStyle: z.string().optional(),
    publishing: z.object({
      defaultAuthor: z.string().optional(),
      autoPublish: z.boolean().optional(),
    }).optional(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const account = await createAccount(session.user.id, parsed.data)
    return NextResponse.json({
      id: account!.id,
      name: account!.name,
      appId: maskAppId(account!.appId),
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create account:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
