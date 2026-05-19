import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'
import { listTrainingExercises } from '@/lib/exercises'
import {
  ensureTrainingSession,
  pickNextExerciseId,
  hasAnyTrainerPaced,
} from '@/lib/sessions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data: training } = await supabase
    .from('trainings')
    .select('workspace_id, status')
    .eq('id', params.id)
    .maybeSingle()
  if (!training) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(training.workspace_id, 'trainer')
  if (!access.ok) return workspaceErrorResponse(access)

  if (training.status !== 'live') {
    return NextResponse.json(
      { error: 'Set the training to live before starting a session.' },
      { status: 400 },
    )
  }

  const exercises = await listTrainingExercises(params.id)
  if (!hasAnyTrainerPaced(exercises)) {
    return NextResponse.json(
      { error: 'No trainer-paced exercises in this training.' },
      { status: 400 },
    )
  }

  const session = await ensureTrainingSession(params.id)
  const first = pickNextExerciseId(exercises, null)
  const { data, error } = await supabase
    .from('training_sessions')
    .update({
      status: 'live',
      current_exercise_id: first,
      started_at: new Date().toISOString(),
      wrapped_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .select('*')
    .single()
  if (error) {
    console.error('session/start', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
  return NextResponse.json({ session: data })
}
