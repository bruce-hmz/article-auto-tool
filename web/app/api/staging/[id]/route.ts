import { NextRequest, NextResponse } from 'next/server'
import { stagingService } from '@/lib/services/staging-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const staging = await stagingService.load(id)
    if (!staging) {
      return NextResponse.json(
        { error: 'Staging record not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(staging)
  } catch (error) {
    console.error('Failed to load staging:', error)
    return NextResponse.json(
      { error: 'Failed to load staging' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await stagingService.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete staging:', error)
    return NextResponse.json(
      { error: 'Failed to delete staging' },
      { status: 500 }
    )
  }
}
