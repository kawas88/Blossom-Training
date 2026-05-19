import { notFound } from 'next/navigation'
import {
  ENABLED_EXERCISE_TYPES,
  EXERCISE_TYPE_LABELS,
  defaultConfigFor,
  type ExerciseType,
} from '@/lib/exercises'
import { ExerciseEditor } from '../../ExerciseEditor'

export const dynamic = 'force-dynamic'

type Params = { type: string }

export default function NewExerciseForTypePage({ params }: { params: Params }) {
  const type = params.type as ExerciseType
  if (!(ENABLED_EXERCISE_TYPES as readonly string[]).includes(type)) {
    notFound()
  }
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          New {EXERCISE_TYPE_LABELS[type].toLowerCase()}
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
          Build a <span className="italic-sage">{EXERCISE_TYPE_LABELS[type].toLowerCase()}.</span>
        </h1>
      </div>
      <ExerciseEditor
        mode="create"
        type={type}
        initial={{
          title: '',
          description: '',
          config: defaultConfigFor(type),
        }}
      />
    </div>
  )
}
