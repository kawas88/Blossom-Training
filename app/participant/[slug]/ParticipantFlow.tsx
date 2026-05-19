'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'
import type {
  Survey,
  SurveyQuestion,
  Training,
  Participant,
} from '@/lib/types'
import {
  EXERCISE_TYPE_LABELS,
  isMatchingExercise,
  isQuizExercise,
  isReflectionExercise,
  type Exercise,
  type ExerciseType,
  type MatchingConfig,
  type QuizConfig,
  type ReflectionConfig,
  type TrainingExerciseWithDef,
} from '@/lib/exercises'
import { Button } from '@/components/ui/Button'
import { MatchingPlayer } from './MatchingPlayer'
import { QuizPlayer } from './QuizPlayer'
import { ReflectionPlayer } from './ReflectionPlayer'
import { SurveyForm } from './SurveyForm'
import { ActivityHub, type HubActivity } from './ActivityHub'

type Stage =
  | { kind: 'hub' }
  | { kind: 'exercise'; exerciseId: string }
  | { kind: 'exercise-done'; exerciseId: string }
  | { kind: 'survey' }
  | { kind: 'survey-done' }

type Props = {
  training: Training
  participant: Participant
  exercises: TrainingExerciseWithDef[]
  completedExerciseIds: string[]
  survey: Survey | null
  questions: SurveyQuestion[]
}

const EXERCISE_ICON: Record<ExerciseType, 'sparkles' | 'clipboard'> = {
  matching: 'sparkles',
  quiz: 'sparkles',
  reflection: 'clipboard',
  word_cloud: 'sparkles',
  ranking: 'sparkles',
  annotation: 'sparkles',
  scenario: 'sparkles',
}

const EXERCISE_BLURB: Record<ExerciseType, string> = {
  matching: 'Match items to their groups',
  quiz: 'A few multiple-choice questions',
  reflection: 'A short written reflection',
  word_cloud: 'Add words to the cloud',
  ranking: 'Rank in order',
  annotation: 'Tap regions of an image',
  scenario: 'A branching story',
}

export function ParticipantFlow({
  training,
  participant,
  exercises,
  completedExerciseIds,
  survey,
  questions,
}: Props) {
  const [stage, setStage] = useState<Stage>({ kind: 'hub' })

  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(completedExerciseIds),
  )
  const [startedInSession, setStartedInSession] = useState<Set<string>>(
    () => new Set(),
  )
  const [surveyCompleted, setSurveyCompleted] = useState<boolean>(
    !!participant.survey_completed_at,
  )
  const [surveyStartedInSession, setSurveyStartedInSession] = useState<boolean>(
    false,
  )

  const hasSurvey = !!survey && questions.length > 0

  function tapExercise(exerciseId: string) {
    if (completed.has(exerciseId)) {
      setStage({ kind: 'exercise-done', exerciseId })
    } else {
      setStartedInSession((s) => new Set(s).add(exerciseId))
      setStage({ kind: 'exercise', exerciseId })
    }
  }

  function tapSurvey() {
    if (surveyCompleted) {
      setStage({ kind: 'survey-done' })
    } else {
      setSurveyStartedInSession(true)
      setStage({ kind: 'survey' })
    }
  }

  function backToHub() {
    setStage({ kind: 'hub' })
  }

  function onExerciseFinished(exerciseId: string) {
    setCompleted((s) => new Set(s).add(exerciseId))
    setStartedInSession((s) => {
      const next = new Set(s)
      next.delete(exerciseId)
      return next
    })
    setStage({ kind: 'hub' })
  }

  function onSurveyFinished() {
    setSurveyCompleted(true)
    setSurveyStartedInSession(false)
    setStage({ kind: 'hub' })
  }

  const activities: HubActivity[] = exercises.map((ex) => ({
    id: ex.id,
    title: titleForExercise(ex),
    description: ex.description?.trim() || EXERCISE_BLURB[ex.type],
    completed: completed.has(ex.id),
    inProgress: startedInSession.has(ex.id) && !completed.has(ex.id),
    icon: EXERCISE_ICON[ex.type],
    onTap: () => tapExercise(ex.id),
  }))
  if (hasSurvey) {
    activities.push({
      id: 'survey',
      title: 'Feedback',
      description: survey?.description?.trim() || 'Share your thoughts',
      completed: surveyCompleted,
      inProgress: surveyStartedInSession && !surveyCompleted,
      icon: 'clipboard',
      onTap: tapSurvey,
    })
  }

  const activeExercise =
    stage.kind === 'exercise' || stage.kind === 'exercise-done'
      ? exercises.find((e) => e.id === stage.exerciseId) ?? null
      : null
  const headerLabel = headerLabelFor(stage, activeExercise)
  const inActivity = stage.kind !== 'hub'

  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur-md border-b border-ink/10">
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {inActivity ? (
              <button
                onClick={backToHub}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-ink/70 hover:bg-sand/40 hover:text-ink transition-colors -ml-2"
                aria-label="Back to activities"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Activities
              </button>
            ) : (
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
                TZ
              </div>
            )}
            <div className="hidden sm:block w-px h-4 bg-ink/15" />
            <div className="truncate font-serif text-base md:text-lg text-ink tracking-tightish">
              {training.title}
            </div>
          </div>
          {inActivity && headerLabel && (
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
              {headerLabel}
            </span>
          )}
        </div>
      </header>

      <div className="sr-only" aria-live="polite">
        Stage: {stage.kind}
      </div>

      <div key={stageKey(stage)} className="flex-1">
        {renderStage({
          stage,
          training,
          participant,
          exercises,
          activities,
          survey,
          questions,
          onExerciseFinished,
          onSurveyFinished,
          backToHub,
        })}
      </div>
    </main>
  )
}

function titleForExercise(ex: TrainingExerciseWithDef): string {
  // Preserve the "Warm-up" hub label on legacy matching exercises so
  // existing trainings look unchanged after migration.
  if (
    ex.type === 'matching' &&
    typeof (ex.config as MatchingConfig).legacyIcebreakerId === 'string'
  ) {
    return 'Warm-up'
  }
  return ex.title || EXERCISE_TYPE_LABELS[ex.type]
}

function stageKey(stage: Stage): string {
  if (stage.kind === 'hub') return 'hub'
  if (stage.kind === 'survey') return 'survey'
  if (stage.kind === 'survey-done') return 'survey-done'
  return `${stage.kind}-${stage.exerciseId}`
}

function headerLabelFor(
  stage: Stage,
  active: TrainingExerciseWithDef | null,
): string | null {
  if (stage.kind === 'hub') return null
  if (stage.kind === 'survey' || stage.kind === 'survey-done') return 'Feedback'
  if (!active) return null
  if (active.type === 'matching') return 'Warm-up'
  return EXERCISE_TYPE_LABELS[active.type]
}

type StageRenderArgs = {
  stage: Stage
  training: Training
  participant: Participant
  exercises: TrainingExerciseWithDef[]
  activities: HubActivity[]
  survey: Survey | null
  questions: SurveyQuestion[]
  onExerciseFinished: (exerciseId: string) => void
  onSurveyFinished: () => void
  backToHub: () => void
}

function renderStage(args: StageRenderArgs) {
  const {
    stage,
    training,
    participant,
    exercises,
    activities,
    survey,
    questions,
    onExerciseFinished,
    onSurveyFinished,
    backToHub,
  } = args

  if (stage.kind === 'hub') {
    return (
      <ActivityHub
        activities={activities}
        participantName={participant.display_name}
      />
    )
  }

  if (stage.kind === 'survey' && survey) {
    return (
      <SurveyForm
        training={training}
        participant={participant}
        survey={survey}
        questions={questions}
        onComplete={onSurveyFinished}
      />
    )
  }

  if (stage.kind === 'survey-done') {
    return <AlreadyCompleted onBack={backToHub} label="feedback" />
  }

  if (stage.kind === 'exercise-done') {
    const ex = exercises.find((e) => e.id === stage.exerciseId)
    return (
      <AlreadyCompleted
        onBack={backToHub}
        label={ex && ex.type === 'matching' ? 'warm-up' : 'response'}
      />
    )
  }

  if (stage.kind === 'exercise') {
    const ex = exercises.find((e) => e.id === stage.exerciseId)
    if (!ex) return <AlreadyCompleted onBack={backToHub} label="exercise" />
    const onDone = () => onExerciseFinished(ex.id)
    if (isMatchingExercise(ex)) {
      return (
        <MatchingPlayer
          training={training}
          participant={participant}
          exercise={ex as Exercise & { config: MatchingConfig }}
          onComplete={onDone}
        />
      )
    }
    if (isQuizExercise(ex)) {
      return (
        <QuizPlayer
          training={training}
          participant={participant}
          exercise={ex as Exercise & { config: QuizConfig }}
          onComplete={onDone}
        />
      )
    }
    if (isReflectionExercise(ex)) {
      return (
        <ReflectionPlayer
          training={training}
          participant={participant}
          exercise={ex as Exercise & { config: ReflectionConfig }}
          onComplete={onDone}
        />
      )
    }
    return (
      <div className="px-4 md:px-6 py-16 text-center">
        <p className="text-ink/70">
          This exercise type ({ex.type}) isn&rsquo;t playable yet.
        </p>
        <Button variant="secondary" onClick={backToHub} className="mt-6">
          <ArrowLeft className="h-4 w-4" />
          Back to activities
        </Button>
      </div>
    )
  }

  return null
}

function AlreadyCompleted({
  onBack,
  label,
}: {
  onBack: () => void
  label: string
}) {
  return (
    <div className="px-4 md:px-6 py-16 md:py-24 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sage/15">
          <Check className="h-8 w-8 text-sage" strokeWidth={2} />
        </div>
        <h2 className="font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
          You&rsquo;ve already completed this — <span className="italic-sage">thank you!</span>
        </h2>
        <p className="mt-3 text-ink/60 text-balance">
          Your {label} response is safe with us.
        </p>
        <div className="mt-8">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back to activities
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
