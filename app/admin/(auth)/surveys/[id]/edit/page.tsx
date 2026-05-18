import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveWorkspace } from '@/lib/workspace'
import { SurveyEditorForm } from '../../SurveyForm'
import type { Survey, SurveyQuestion } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Params = { id: string }

export default async function EditSurveyPage({ params }: { params: Params }) {
  const active = await getActiveWorkspace()
  const workspaceId = active!.workspace.id
  const supabase = createAdminClient()
  const { data: survey } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle<Survey>()
  if (!survey) notFound()
  const { data: qs } = await supabase
    .from('survey_questions')
    .select('*')
    .eq('survey_id', survey.id)
    .order('position')

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Edit survey
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
          {survey.title}
        </h1>
      </div>
      <SurveyEditorForm initial={{ survey, questions: (qs ?? []) as SurveyQuestion[] }} />
    </div>
  )
}
