import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { workflowService } from '@/lib/services/workflow-service'
import { ExecutionManager } from '@/lib/execution/execution-manager'
import { WorkflowExecutor } from '@/lib/execution/workflow-executor'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing workflow ID' }, { status: 400 })
    }

    const workflow = await workflowService.load(id)
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Scope check: only allow executing own workflows
    if ((workflow as any).userId && (workflow as any).userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure userId is on the workflow
    if (!(workflow as any).userId) {
      ;(workflow as any).userId = session.user.id
      await workflowService.save(workflow)
    }

    // Create execution session if not exists
    let session_data = ExecutionManager.getSession(id)
    if (!session_data) {
      session_data = ExecutionManager.createSession(id)
    }

    // Start workflow execution
    const executor = new WorkflowExecutor(workflow)

    // Store executor so input route can resume it
    ExecutionManager.setExecutor(id, executor)

    // Run execution in background
    executor.execute().catch((error) => {
      console.error('Workflow execution error:', error)
      ExecutionManager.updateStatus(id, 'failed')
    })

    return NextResponse.json({
      success: true,
      workflowId: id,
      message: 'Workflow execution started',
      workflowUrl: `/workflows/${id}`,
    })
  } catch (error) {
    console.error('Failed to execute workflow:', error)
    return NextResponse.json({ error: 'Failed to execute workflow' }, { status: 500 })
  }
}
