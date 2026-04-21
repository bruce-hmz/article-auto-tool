import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAccountsByUserId } from '@/lib/db/queries/accounts'
import { getBriefByAccountId } from '@/lib/db/queries/briefs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await getAccountsByUserId(session.user.id)
    const briefs = await Promise.all(
      accounts.map(async (account) => {
        const brief = await getBriefByAccountId(account.id)
        return brief ? {
          ...brief,
          topicDomains: brief.topicDomains ? JSON.parse(brief.topicDomains) : null,
          promptOverrides: brief.promptOverrides ? JSON.parse(brief.promptOverrides) : null,
        } : null
      })
    )

    return NextResponse.json(briefs.filter(Boolean))
  } catch (error) {
    console.error('Failed to list briefs:', error)
    return NextResponse.json({ error: 'Failed to list briefs' }, { status: 500 })
  }
}
