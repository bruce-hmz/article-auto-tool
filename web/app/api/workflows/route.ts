import { NextRequest, NextResponse } from 'next/server'
import { workflowService } from '@/lib/services/workflow-service'
import type { WorkflowMode } from '@/lib/types'

export async function GET() {
  try {
    const workflows = await workflowService.listWorkflows()
    return NextResponse.json(workflows)
  } catch (error) {
    console.error('Failed to list workflows:', error)
    return NextResponse.json(
      { error: 'Failed to list workflows' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, accountId, outputPath } = body

    if (!mode || !['key_checkpoint', 'auto', 'step_by_step'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be one of: key_checkpoint, auto, step_by_step' },
        { status: 400 }
      )
    }

    const workflow = await workflowService.createWorkflow(
      mode as WorkflowMode,
      accountId,
      outputPath
    )

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    console.error('Failed to create workflow:', error)
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    )
  }
}
