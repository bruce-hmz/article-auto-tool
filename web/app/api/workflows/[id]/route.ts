import { NextRequest, NextResponse } from 'next/server'
import { workflowService } from '@/lib/services/workflow-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workflow = await workflowService.load(id)
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(workflow)
  } catch (error) {
    console.error('Failed to load workflow:', error)
    return NextResponse.json(
      { error: 'Failed to load workflow' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['running', 'paused', 'completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    await workflowService.updateStatus(id, status)
    const workflow = await workflowService.load(id)
    return NextResponse.json(workflow)
  } catch (error) {
    console.error('Failed to update workflow:', error)
    return NextResponse.json(
      { error: 'Failed to update workflow' },
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
    await workflowService.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete workflow:', error)
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    )
  }
}
