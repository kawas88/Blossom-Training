import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveWorkspace } from '@/lib/workspace'
import {
  countTrainingsUsingExercise,
  EXERCISE_TYPE_LABELS,
  type Exercise,
} from '@/lib/exercises'
import { ExerciseEditor } from '../ExerciseEditor'

export const dynamic = 'force-dynamic'

type Params = { id: string }

export default async function EditExercisePage({ params }: { params: Params }) {
  const active = await getActiveWorkspace()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', active!.workspace.id)
    .maybeSingle<Exercise>()
  if (!data) notFound()

  const usageCount = await countTrainingsUsingExercise(params.id)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Edit {EXERCISE_TYPE_LABELS[data.type].toLowerCase()}
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
          {data.title}
        </h1>
      </div>

      {usageCount > 0 && (
        <div className="rounded-2xl bg-warn/10 border border-warn/20 px-4 py-3 text-sm text-ink/80">
          This exercise is part of <span className="font-medium">{usageCount}</span> training
          {usageCount === 1 ? '' : 's'}. Changes will affect those trainings.
        </div>
      )}

      <ExerciseEditor
        mode="edit"
        type={data.type}
        exerciseId={data.id}
        initial={{
          title: data.title,
          description: data.description ?? '',
          config: data.config,
        }}
      />
    </div>
  )
}
