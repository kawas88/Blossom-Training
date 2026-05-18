import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveWorkspace } from '@/lib/workspace'
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
    { data: matchingResponses },
    { data: promptResponses },
    { data: surveyResponses },
    { data: notes },
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
    supabase.from('icebreaker_matching_responses').select('*').eq('training_id', training.id),
    supabase.from('icebreaker_prompt_responses').select('*').eq('training_id', training.id),
    supabase.from('survey_responses').select('*').eq('training_id', training.id),
    supabase.from('trainer_notes').select('*').eq('training_id', training.id).order('created_at', { ascending: false }),
  ])

  let categories: IcebreakerCategory[] = []
  let items: IcebreakerItem[] = []
  let prompts: IcebreakerPrompt[] = []
  if (icebreaker) {
    if (icebreaker.format === 'matching') {
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
    } else {
      const { data: p } = await supabase
        .from('icebreaker_prompts')
        .select('*')
        .eq('icebreaker_id', icebreaker.id)
        .order('position')
      prompts = (p ?? []) as IcebreakerPrompt[]
    }
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
      matchingResponses={(matchingResponses ?? []) as IcebreakerMatchingResponse[]}
      promptResponses={(promptResponses ?? []) as IcebreakerPromptResponse[]}
      surveyResponses={(surveyResponses ?? []) as SurveyResponse[]}
      notes={(notes ?? []) as TrainerNote[]}
    />
  )
}
