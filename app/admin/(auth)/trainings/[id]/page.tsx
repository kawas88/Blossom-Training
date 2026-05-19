import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveWorkspace } from '@/lib/workspace'
import {
  listExercisesForWorkspace,
  listTrainingExercises,
  type Exercise,
  type MatchingConfig,
  type TrainingExerciseWithDef,
} from '@/lib/exercises'
import { TrainingDashboard } from './TrainingDashboard'
import type {
  Training,
  Participant,
  Icebreaker,
  IcebreakerCategory,
  IcebreakerItem,
  IcebreakerPrompt,
  Survey,
  SurveyQuestion,
  SurveyResponse,
  IcebreakerMatchingResponse,
  IcebreakerPromptResponse,
  TrainerNote,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

type Params = { id: string }

export default async function TrainingDetailPage({ params }: { params: Params }) {
  const active = await getActiveWorkspace()
  const workspaceId = active!.workspace.id
  const supabase = createAdminClient()
  const { data: training } = await supabase
    .from('trainings')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle<Training>()

  if (!training) notFound()

  const [
    { data: participants },
    { data: icebreaker },
    { data: survey },
    { data: promptResponses },
    { data: surveyResponses },
    { data: notes },
    trainingExercises,
    workspaceExercises,
  ] = await Promise.all([
    supabase
      .from('participants')
      .select('*')
      .eq('training_id', training.id)
      .order('joined_at', { ascending: false }),
    training.icebreaker_id
      ? supabase.from('icebreakers').select('*').eq('id', training.icebreaker_id).maybeSingle<Icebreaker>()
      : Promise.resolve({ data: null }),
    training.survey_id
      ? supabase.from('surveys').select('*').eq('id', training.survey_id).maybeSingle<Survey>()
      : Promise.resolve({ data: null }),
    supabase.from('icebreaker_prompt_responses').select('*').eq('training_id', training.id),
    supabase.from('survey_responses').select('*').eq('training_id', training.id),
    supabase.from('trainer_notes').select('*').eq('training_id', training.id).order('created_at', { ascending: false }),
    listTrainingExercises(training.id),
    listExercisesForWorkspace(workspaceId),
  ])

  // For the legacy IcebreakerTab UI, build matching responses by reading from
  // exercise_responses (new home for matching submissions) and flattening
  // back to the one-row-per-item shape the tab expects.
  const matchingExercise = trainingExercises.find((e) => e.type === 'matching') ?? null
  let matchingResponses: IcebreakerMatchingResponse[] = []
  if (matchingExercise) {
    const { data: exerciseRows } = await supabase
      .from('exercise_responses')
      .select('*')
      .eq('exercise_id', matchingExercise.id)
    matchingResponses = flattenMatchingResponses(
      training.id,
      matchingExercise,
      exerciseRows ?? [],
    )
  }

  // Build the legacy categories/items view from whichever source has data.
  // For migrated icebreakers both sources exist; for brand-new matching
  // exercises (created in Phase 3A+) only the exercises.config does.
  let categories: IcebreakerCategory[] = []
  let items: IcebreakerItem[] = []
  let prompts: IcebreakerPrompt[] = []
  if (icebreaker && icebreaker.format === 'matching') {
    const [{ data: c }, { data: i }] = await Promise.all([
      supabase
        .from('icebreaker_categories')
        .select('*')
        .eq('icebreaker_id', icebreaker.id)
        .order('position'),
      supabase
        .from('icebreaker_items')
        .select('*')
        .eq('icebreaker_id', icebreaker.id)
        .order('position'),
    ])
    categories = (c ?? []) as IcebreakerCategory[]
    items = (i ?? []) as IcebreakerItem[]
  } else if (matchingExercise) {
    const m = matchingExercise.config as MatchingConfig
    categories = (m.ageGroups ?? []).map((g) => ({
      id: g.id,
      icebreaker_id: matchingExercise.id,
      label: g.label,
      position: g.position,
      created_at: matchingExercise.created_at,
    }))
    items = (m.milestones ?? []).map((it) => ({
      id: it.id,
      icebreaker_id: matchingExercise.id,
      text: it.text,
      correct_category_id: m.correctPlacements?.[it.id] ?? null,
      tag_label: it.tagLabel,
      tag_color: it.tagColor,
      position: it.position,
      created_at: matchingExercise.created_at,
    }))
  }
  if (icebreaker && icebreaker.format === 'prompts') {
    const { data: p } = await supabase
      .from('icebreaker_prompts')
      .select('*')
      .eq('icebreaker_id', icebreaker.id)
      .order('position')
    prompts = (p ?? []) as IcebreakerPrompt[]
  }

  let questions: SurveyQuestion[] = []
  if (survey) {
    const { data: qs } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', survey.id)
      .order('position')
    questions = (qs ?? []) as SurveyQuestion[]
  }

  return (
    <TrainingDashboard
      training={training}
      participants={(participants ?? []) as Participant[]}
      icebreaker={icebreaker as Icebreaker | null}
      categories={categories}
      items={items}
      prompts={prompts}
      survey={survey as Survey | null}
      questions={questions}
      matchingResponses={matchingResponses}
      promptResponses={(promptResponses ?? []) as IcebreakerPromptResponse[]}
      surveyResponses={(surveyResponses ?? []) as SurveyResponse[]}
      notes={(notes ?? []) as TrainerNote[]}
      trainingExercises={trainingExercises}
      workspaceExercises={workspaceExercises}
      matchingExerciseId={matchingExercise?.id ?? null}
    />
  )
}

// ---------------------------------------------------------------------
// Flatten new-shape exercise_responses (one row per participant, with
// placements/firstAttempts/attempts maps) back into the legacy
// icebreaker_matching_responses shape (one row per item per participant).
// Keeps IcebreakerTab working unchanged.
// ---------------------------------------------------------------------
function flattenMatchingResponses(
  trainingId: string,
  exercise: TrainingExerciseWithDef | Exercise,
  rows: Array<{
    participant_id: string
    completed_at: string | null
    response: unknown
  }>,
): IcebreakerMatchingResponse[] {
  const config = (exercise.config ?? {}) as MatchingConfig
  const correctMap = config.correctPlacements ?? {}
  const out: IcebreakerMatchingResponse[] = []
  for (const row of rows) {
    const r = (row.response ?? {}) as {
      placements?: Record<string, string | null>
      firstAttempts?: Record<string, string>
      attempts?: Record<string, number>
    }
    const itemIds = new Set<string>([
      ...Object.keys(r.placements ?? {}),
      ...Object.keys(r.firstAttempts ?? {}),
      ...Object.keys(r.attempts ?? {}),
    ])
    for (const itemId of itemIds) {
      const firstAttempt = r.firstAttempts?.[itemId] || null
      const placed = r.placements?.[itemId] || null
      const wasCorrect =
        !!placed && correctMap[itemId] === placed
      out.push({
        id: `${row.participant_id}-${itemId}`,
        participant_id: row.participant_id,
        training_id: trainingId,
        item_id: itemId,
        first_attempt_category_id: firstAttempt || null,
        was_correct: wasCorrect,
        attempts: r.attempts?.[itemId] ?? 1,
        created_at: row.completed_at ?? new Date().toISOString(),
      })
    }
  }
  return out
}
