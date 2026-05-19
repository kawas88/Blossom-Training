import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PATCH /api/admin/trainings/[id]/questions/[questionId]
// Body: { action: 'mark_answered' | 'unmark_answered' | 'hide' | 'unhide' }
// Trainer-only — gated by workspace role 'trainer' or above.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; questionId: string } },
) {
  try {
    const supabase = createAdminClient()
    const { data: training } = await supabase
      .from('trainings')
      .select('workspace_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!training) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 })
    }
    const access = await requireWorkspaceAccess(training.workspace_id, 'trainer')
    if (!access.ok) return workspaceErrorResponse(access)

    const body = await req.json()
    const action = String(body.action || '')
    const valid = ['mark_answered', 'unmark_answered', 'hide', 'unhide']
    if (!valid.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {}
    if (action === 'mark_answered') {
      patch.status = 'answered'
      patch.answered_at = new Date().toISOString()
    } else if (action === 'unmark_answered') {
      patch.status = 'pending'
      patch.answered_at = null
    } else if (action === 'hide') {
      patch.status = 'hidden'
    } else if (action === 'unhide') {
      patch.status = 'pending'
    }

    const { data, error } = await supabase
      .from('training_questions')
      .update(patch)
      .eq('id', params.questionId)
      .eq('training_id', params.id)
      .select('*')
      .single()
    if (error) {
      console.error('question moderation', error)
      return NextResponse.json({ error: 'Could not update question' }, { status: 500 })
    }
    return NextResponse.json({ question: data })
  } catch (e: unknown) {
    console.error('PATCH question error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
