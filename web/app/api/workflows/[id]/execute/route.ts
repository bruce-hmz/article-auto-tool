import { NextRequest, NextResponse } from 'next/server'
import { workflowService } from '@/lib/services/workflow-service'
import { ExecutionManager } from '@/lib/execution/execution-manager'
import { WorkflowExecutor } from '@/lib/execution/workflow-executor'

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

    const workflow = await workflowService.load(id)
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Create execution session if not exists
    let session = ExecutionManager.getSession(id)
    if (!session) {
      session = ExecutionManager.createSession(id)
    }

    // Start workflow execution
    const executor = new WorkflowExecutor(workflow)

    // Run execution in background
    executor.execute().catch((error) => {
      console.error('Workflow execution error:', error)
      ExecutionManager.updateStatus(id, 'failed')
    })

    // Return success response
    return NextResponse.json({
      success: true,
      workflowId: id,
      message: 'Workflow execution started',
      workflowUrl: `/workflows/${id}`,
    })
  } catch (error) {
    console.error('Failed to execute workflow:', error)
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    )
  }
}
