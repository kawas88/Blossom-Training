import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { ParticipantFlow } from './ParticipantFlow'
import type {
  Icebreaker,
  IcebreakerCategory,
  IcebreakerItem,
  IcebreakerPrompt,
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

  // Load icebreaker
  let icebreaker: Icebreaker | null = null
  let categories: IcebreakerCategory[] = []
  let items: IcebreakerItem[] = []
  let prompts: IcebreakerPrompt[] = []

  if (training.icebreaker_id) {
    const { data: ice } = await supabase
      .from('icebreakers')
      .select('*')
      .eq('id', training.icebreaker_id)
      .maybeSingle<Icebreaker>()
    icebreaker = ice ?? null
    if (ice) {
      if (ice.format === 'matching') {
        const [{ data: cats }, { data: its }] = await Promise.all([
          supabase
            .from('icebreaker_categories')
            .select('*')
            .eq('icebreaker_id', ice.id)
            .order('position'),
          supabase
            .from('icebreaker_items')
            .select('*')
            .eq('icebreaker_id', ice.id)
            .order('position'),
        ])
        categories = (cats ?? []) as IcebreakerCategory[]
        items = (its ?? []) as IcebreakerItem[]
      } else {
        const { data: pr } = await supabase
          .from('icebreaker_prompts')
          .select('*')
          .eq('icebreaker_id', ice.id)
          .order('position')
        prompts = (pr ?? []) as IcebreakerPrompt[]
      }
    }
  }

  // Load survey
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
      icebreaker={icebreaker}
      categories={categories}
      items={items}
      prompts={prompts}
      survey={survey}
      questions={questions}
    />
  )
}
