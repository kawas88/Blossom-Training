import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveWorkspace } from '@/lib/workspace'
import {
  listTrainingExercises,
  type ExerciseResponse,
} from '@/lib/exercises'
import { ensureTrainingSession, hasAnyTrainerPaced } from '@/lib/sessions'
import type { Training, Participant } from '@/lib/types'
import { LiveCockpit } from './LiveCockpit'

export const dynamic = 'force-dynamic'

type Params = { id: string }

export default async function RunLivePage({ params }: { params: Params }) {
  const active = await getActiveWorkspace()
  const supabase = createAdminClient()
  const { data: training } = await supabase
    .from('trainings')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', active!.workspace.id)
    .maybeSingle<Training>()
  if (!training) notFound()

  const trainingExercises = await listTrainingExercises(training.id)
  if (!hasAnyTrainerPaced(trainingExercises)) {
    // Nothing to run — bounce back to the training detail page.
    redirect(`/admin/trainings/${training.id}`)
  }

  const session = await ensureTrainingSession(training.id)

  const [{ data: participants }, { data: rawResponses }] = await Promise.all([
    supabase
      .from('participants')
      .select('*')
      .eq('training_id', training.id)
      .order('joined_at', { ascending: true }),
    supabase
      .from('exercise_responses')
      .select('*')
      .eq('training_id', training.id)
      .order('completed_at', { ascending: true }),
  ])

  return (
    <LiveCockpit
      training={training}
      trainingExercises={trainingExercises}
      initialSession={session}
      initialParticipants={(participants ?? []) as Participant[]}
      initialResponses={(rawResponses ?? []) as ExerciseResponse[]}
    />
  )
}
