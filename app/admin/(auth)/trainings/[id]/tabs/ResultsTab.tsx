'use client'

import { useMemo, useState } from 'react'
import { Layers } from 'lucide-react'
import {
  EXERCISE_TYPE_LABELS,
  type ExerciseResponse,
  type ExerciseType,
  type TrainingExerciseWithDef,
} from '@/lib/exercises'
import type {
  Icebreaker,
  IcebreakerCategory,
  IcebreakerItem,
  IcebreakerPrompt,
  IcebreakerMatchingResponse,
  IcebreakerPromptResponse,
  Participant,
} from '@/lib/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { IcebreakerTab } from './IcebreakerTab'
import { QuizResults } from './results/QuizResults'
import { ReflectionResults } from './results/ReflectionResults'
import { WordCloudResults } from './results/WordCloudResults'

const TYPE_TONE: Record<ExerciseType, string> = {
  matching: 'bg-domain-comm/15 text-domain-comm',
  quiz: 'bg-domain-problem/15 text-domain-problem',
  reflection: 'bg-sage/15 text-sage',
  word_cloud: 'bg-domain-fine/15 text-domain-fine',
  ranking: 'bg-domain-social/15 text-domain-social',
  annotation: 'bg-warn/15 text-warn',
  scenario: 'bg-ink/10 text-ink/70',
}

export type MatchingTabProps = {
  icebreaker: Icebreaker | null
  categories: IcebreakerCategory[]
  items: IcebreakerItem[]
  prompts: IcebreakerPrompt[]
  matchingResponses: IcebreakerMatchingResponse[]
  promptResponses: IcebreakerPromptResponse[]
  participants: Participant[]
}

type Props = {
  trainingExercises: TrainingExerciseWithDef[]
  participants: Participant[]
  exerciseResponses: ExerciseResponse[]
  matchingTabProps: MatchingTabProps | null
}

export function ResultsTab({
  trainingExercises,
  participants,
  exerciseResponses,
  matchingTabProps,
}: Props) {
  const responsesByExercise = useMemo(() => {
    const map: Record<string, ExerciseResponse[]> = {}
    for (const ex of trainingExercises) map[ex.id] = []
    for (const r of exerciseResponses) {
      if (!map[r.exercise_id]) map[r.exercise_id] = []
      map[r.exercise_id].push(r)
    }
    return map
  }, [trainingExercises, exerciseResponses])

  const initialActive = trainingExercises[0]?.id ?? null
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(initialActive)

  if (trainingExercises.length === 0) {
    return (
      <EmptyState
        icon={<Layers className="h-5 w-5" />}
        title="No exercises yet"
        description="Add an exercise from the Exercises tab and results will show here as participants complete it."
      />
    )
  }

  if (exerciseResponses.length === 0) {
    return (
      <EmptyState
        title="No responses yet"
        description="Share your join code and answers will appear here in real-time."
      />
    )
  }

  const showSubNav = trainingExercises.length > 1
  const activeExercise =
    trainingExercises.find((e) => e.id === activeExerciseId) ?? trainingExercises[0]
  const activeResponses = responsesByExercise[activeExercise.id] ?? []

  return (
    <div className="space-y-5">
      {showSubNav && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {trainingExercises.map((ex) => {
              const isActive = ex.id === activeExercise.id
              return (
                <button
                  key={ex.id}
                  onClick={() => setActiveExerciseId(ex.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                    isActive
                      ? 'bg-ink text-cream border-ink'
                      : 'bg-white text-ink border-ink/15 hover:border-ink/30',
                  )}
                >
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider',
                      isActive ? 'bg-cream/20 text-cream' : TYPE_TONE[ex.type],
                    )}
                  >
                    {EXERCISE_TYPE_LABELS[ex.type]}
                  </span>
                  <span className="truncate max-w-[160px]">{ex.title}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px]',
                      isActive ? 'bg-cream/15 text-cream' : 'bg-ink/5 text-ink/60',
                    )}
                  >
                    {(responsesByExercise[ex.id] ?? []).length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <PerExerciseResults
        exercise={activeExercise}
        responses={activeResponses}
        participants={participants}
        matchingTabProps={matchingTabProps}
      />
    </div>
  )
}

function PerExerciseResults({
  exercise,
  responses,
  participants,
  matchingTabProps,
}: {
  exercise: TrainingExerciseWithDef
  responses: ExerciseResponse[]
  participants: Participant[]
  matchingTabProps: MatchingTabProps | null
}) {
  if (responses.length === 0) {
    return (
      <EmptyState
        title="No responses for this exercise yet"
        description="Once participants complete it, their answers appear here."
      />
    )
  }

  if (exercise.type === 'matching' && matchingTabProps) {
    return <IcebreakerTab {...matchingTabProps} />
  }

  if (exercise.type === 'quiz') {
    return (
      <QuizResults
        exercise={exercise}
        responses={responses}
        participants={participants}
      />
    )
  }

  if (exercise.type === 'reflection') {
    return (
      <ReflectionResults
        exercise={exercise}
        responses={responses}
        participants={participants}
      />
    )
  }

  if (exercise.type === 'word_cloud') {
    return (
      <WordCloudResults
        exercise={exercise}
        responses={responses}
        participants={participants}
      />
    )
  }

  return (
    <EmptyState
      title="Results view coming soon"
      description={`Results for ${EXERCISE_TYPE_LABELS[exercise.type]} exercises will be displayed here in a future release.`}
    />
  )
}
