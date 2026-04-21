import { NextRequest, NextResponse } from 'next/server'
import { accountService } from '@/lib/services/account-service'

export async function GET() {
  try {
    await accountService.loadAccounts()
    const accounts = accountService.getAllAccounts()

    // Mask sensitive information
    const safeAccounts = accounts.map(account => ({
      id: account.id,
      name: account.name,
      appId: account.appId ? `${account.appId.slice(0, 4)}****` : 'Not configured',
      hasAppSecret: !!account.appSecret && !account.appSecret.startsWith('${'),
      config: account.config,
    }))

    return NextResponse.json(safeAccounts)
  } catch (error) {
    console.error('Failed to list accounts:', error)
    return NextResponse.json(
      { error: 'Failed to list accounts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      )
    }

    await accountService.loadAccounts()
    const result = await accountService.validateAccount(accountId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to validate account:', error)
    return NextResponse.json(
      { error: 'Failed to validate account' },
      { status: 500 }
    )
  }
}
