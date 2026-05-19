import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'
import { getTrainingSession } from '@/lib/sessions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data: training } = await supabase
    .from('trainings')
    .select('workspace_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!training) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(training.workspace_id, 'trainer')
  if (!access.ok) return workspaceErrorResponse(access)

  const session = await getTrainingSession(params.id)
  if (!session) {
    return NextResponse.json({ error: 'No session to wrap.' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('training_sessions')
    .update({
      status: 'wrapped',
      current_exercise_id: null,
      wrapped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
  return NextResponse.json({ session: data })
}
