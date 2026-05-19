import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { ParticipantFlow } from './ParticipantFlow'
import {
  listTrainingExercises,
  type TrainingExerciseWithDef,
} from '@/lib/exercises'
import {
  ensureTrainingSession,
  hasAnyTrainerPaced,
  type TrainingSession,
} from '@/lib/sessions'
import type {
  Survey,
  SurveyQuestion,
  Training,
  Participant,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

type Params = { slug: string }

export default async function ParticipantPage({ params }: { params: Params }) {
  const supabase = createAdminClient()

  const { data: training } = await supabase
    .from('trainings')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle<Training>()

  if (!training) {
    redirect('/')
  }

  if (training.status !== 'live') {
    redirect(`/?code=${training.join_code}`)
  }

  const sessionCookie = cookies().get(`pt_${training.id}`)
  if (!sessionCookie?.value) {
    redirect(`/join?code=${training.join_code}`)
  }

  const { data: participant } = await supabase
    .from('participants')
    .select('*')
    .eq('session_token', sessionCookie.value)
    .eq('training_id', training.id)
    .maybeSingle<Participant>()

  if (!participant) {
    redirect(`/join?code=${training.join_code}`)
  }

  // Load the ordered list of exercises attached to this training.
  const exercises: TrainingExerciseWithDef[] = await listTrainingExercises(
    training.id,
  )

  // If the training has trainer-paced exercises, seed a session row so
  // participants can subscribe to it via Realtime even before the trainer
  // hits Start.
  let initialSession: TrainingSession | null = null
  if (hasAnyTrainerPaced(exercises)) {
    initialSession = await ensureTrainingSession(training.id)
  }

  // Which exercises has this participant already completed?
  const { data: completedRows } = await supabase
    .from('exercise_responses')
    .select('exercise_id')
    .eq('training_id', training.id)
    .eq('participant_id', participant.id)
  const completedExerciseIds = new Set(
    (completedRows ?? []).map((r) => r.exercise_id as string),
  )

  // Load survey (legacy attachment, unchanged for now)
  let survey: Survey | null = null
  let questions: SurveyQuestion[] = []
  if (training.survey_id) {
    const { data: s } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', training.survey_id)
      .maybeSingle<Survey>()
    survey = s ?? null
    if (s) {
      const { data: qs } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', s.id)
        .order('position')
      questions = (qs ?? []) as SurveyQuestion[]
    }
  }

  return (
    <ParticipantFlow
      training={training}
      participant={participant}
      exercises={exercises}
      completedExerciseIds={Array.from(completedExerciseIds)}
      survey={survey}
      questions={questions}
      initialSession={initialSession}
    />
  )
}
