import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAccountById, updateAccount, deleteAccount, maskAppId } from '@/lib/db/queries/accounts'
import { deleteBrief } from '@/lib/db/queries/briefs'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const account = await getAccountById(params.id, session.user.id)
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: account.id,
      name: account.name,
      appId: account.appId,
      maskedAppId: maskAppId(account.appId),
      hasAppSecret: true,
      config: account.config ? JSON.parse(account.config) : null,
    })
  } catch (error) {
    console.error('Failed to get account:', error)
    return NextResponse.json({ error: 'Failed to get account' }, { status: 500 })
  }
}

const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  appId: z.string().min(1).optional(),
  appSecret: z.string().min(1).optional(),
  config: z.object({
    defaultTheme: z.string().optional(),
    imageStyle: z.string().optional(),
    publishing: z.object({
      defaultAuthor: z.string().optional(),
      autoPublish: z.boolean().optional(),
    }).optional(),
  }).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const account = await updateAccount(params.id, session.user.id, parsed.data)
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: account.id,
      name: account.name,
      appId: maskAppId(account.appId),
    })
  } catch (error) {
    console.error('Failed to update account:', error)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete brief first (cascade should handle it, but be explicit)
    await deleteBrief(params.id).catch(() => {})
    await deleteAccount(params.id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete account:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
