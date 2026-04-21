import { NextRequest, NextResponse } from 'next/server'
import { stagingService } from '@/lib/services/staging-service'

export async function GET() {
  try {
    const staging = await stagingService.listStaging()
    return NextResponse.json(staging)
  } catch (error) {
    console.error('Failed to list staging:', error)
    return NextResponse.json(
      { error: 'Failed to list staging' },
      { status: 500 }
    )
  }
}
