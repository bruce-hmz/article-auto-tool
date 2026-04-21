import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { workflowService } from '@/lib/services/workflow-service'
import type { WorkflowMode } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workflows = await workflowService.listWorkflows()
    // Filter workflows to only show user's own
    const userWorkflows = (workflows as any[]).filter(
      (w: any) => !w.userId || w.userId === session.user.id
    )
    return NextResponse.json(userWorkflows)
  } catch (error) {
    console.error('Failed to list workflows:', error)
    return NextResponse.json({ error: 'Failed to list workflows' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Store userId with workflow
    ;(workflow as any).userId = session.user.id
    await workflowService.save(workflow)

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    console.error('Failed to create workflow:', error)
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
  }
}
