import { NextRequest, NextResponse } from 'next/server'
import { ExecutionManager } from '@/lib/execution/execution-manager'
import type { UserInput } from '@/lib/types/step-execution'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { error: 'Missing workflow ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { stepId, type, value } = body

    if (stepId === undefined || type === undefined || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: stepId, type, value' },
        { status: 400 }
      )
    }

    // Get the execution session
    const session = ExecutionManager.getSession(id)
    if (!session) {
      return NextResponse.json(
        { error: 'No active execution session for this workflow' },
        { status: 400 }
      )
    }

    // Validate input type matches interaction type
    const pendingInteraction = session.pendingInteraction
    if (!pendingInteraction) {
      return NextResponse.json(
        { error: 'No pending interaction for this workflow' },
        { status: 400 }
      )
    }

    if (pendingInteraction.stepId !== stepId) {
      return NextResponse.json(
        { error: 'Input step ID does not match pending interaction' },
        { status: 400 }
      )
    }

    if (pendingInteraction.type !== type) {
      return NextResponse.json(
        { error: `Invalid input type. Expected ${pendingInteraction.type}, got ${type}` },
        { status: 400 }
      )
    }

    // Create user input object
    const input: UserInput = {
      type,
      stepId,
      value,
    }

    // Submit the input
    const submitted = ExecutionManager.submitInput(id, input)
    if (!submitted) {
      return NextResponse.json(
        { error: 'Failed to submit input' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Input submitted successfully',
    })
  } catch (error) {
    console.error('Failed to submit input:', error)
    return NextResponse.json(
      { error: 'Failed to submit input' },
      { status: 500 }
    )
  }
}
