'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Layers } from 'lucide-react'
import {
  ENABLED_EXERCISE_TYPES,
  EXERCISE_TYPE_BLURBS,
  EXERCISE_TYPE_LABELS,
  type ExerciseType,
} from '@/lib/exercises'
import { cn } from '@/lib/utils'

const ALL_TYPES: { type: ExerciseType; comingSoon: boolean }[] = [
  { type: 'matching', comingSoon: false },
  { type: 'quiz', comingSoon: false },
  { type: 'reflection', comingSoon: false },
  { type: 'word_cloud', comingSoon: false },
  { type: 'ranking', comingSoon: false },
  { type: 'annotation', comingSoon: false },
  { type: 'scenario', comingSoon: false },
]

export default function NewExerciseTypePicker() {
  const router = useRouter()
  const [picked, setPicked] = useState<ExerciseType | null>(null)

  function next() {
    if (!picked) return
    router.push(`/admin/exercises/new/${picked}`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/admin/exercises"
          className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          All exercises
        </Link>
        <p className="mt-4 font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          New exercise
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
          Pick a <span className="italic-sage">type.</span>
        </h1>
      </div>

      <ul className="grid sm:grid-cols-2 gap-3">
        {ALL_TYPES.map(({ type, comingSoon }) => {
          const isPicked = picked === type
          const isEnabled =
            !comingSoon && (ENABLED_EXERCISE_TYPES as readonly string[]).includes(type)
          return (
            <li key={type}>
              <button
                onClick={() => isEnabled && setPicked(type)}
                disabled={!isEnabled}
                className={cn(
                  'group w-full text-left rounded-2xl border p-5 transition-all',
                  'flex items-start gap-4',
                  !isEnabled
                    ? 'bg-cream/50 border-ink/5 opacity-60 cursor-not-allowed'
                    : isPicked
                    ? 'bg-ink text-cream border-ink shadow-card'
                    : 'bg-white border-ink/15 hover:border-ink/40 hover:shadow-soft',
                )}
              >
                <Layers
                  className={cn(
                    'h-5 w-5 mt-0.5 shrink-0',
                    isPicked ? 'text-cream' : 'text-ink/50',
                  )}
                />
                <div className="flex-1 min-w-0">
                  <h3
                    className={cn(
                      'font-serif text-xl tracking-tightish',
                      isPicked ? 'text-cream' : 'text-ink',
                    )}
                  >
                    {EXERCISE_TYPE_LABELS[type]}
                    {comingSoon && (
                      <span className="ml-2 align-middle inline-block rounded-full bg-ink/10 text-ink/60 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5">
                        Coming soon
                      </span>
                    )}
                  </h3>
                  <p
                    className={cn(
                      'mt-1 text-sm',
                      isPicked ? 'text-cream/80' : 'text-ink/60',
                    )}
                  >
                    {EXERCISE_TYPE_BLURBS[type]}
                  </p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={!picked}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all',
            picked
              ? 'bg-ink text-cream hover:bg-sage'
              : 'bg-ink/10 text-ink/40 cursor-not-allowed',
          )}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
