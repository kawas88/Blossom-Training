'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Heart } from 'lucide-react'
import type {
  Survey,
  SurveyQuestion,
  Training,
  Participant,
} from '@/lib/types'
import {
  EXERCISE_TYPE_LABELS,
  isAnnotationExercise,
  isMatchingExercise,
  isQuizExercise,
  isRankingExercise,
  isReflectionExercise,
  isScenarioExercise,
  isWordCloudExercise,
  type AnnotationConfig,
  type Exercise,
  type ExerciseType,
  type MatchingConfig,
  type QuizConfig,
  type RankingConfig,
  type ReflectionConfig,
  type ScenarioConfig,
  type TrainingExerciseWithDef,
  type WordCloudConfig,
} from '@/lib/exercises'
import type { TrainingSession } from '@/lib/sessions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { MatchingPlayer } from './MatchingPlayer'
import { QuizPlayer } from './QuizPlayer'
import { ReflectionPlayer } from './ReflectionPlayer'
import { WordCloudPlayer } from './WordCloudPlayer'
import { RankingPlayer } from './RankingPlayer'
import { AnnotationPlayer } from './AnnotationPlayer'
import { ScenarioPlayer } from './ScenarioPlayer'
import { SurveyForm } from './SurveyForm'
import { ActivityHub, type HubActivity } from './ActivityHub'

type LocalStage =
  | { kind: 'hub' }
  | { kind: 'exercise'; exerciseId: string }
  | { kind: 'exercise-done'; exerciseId: string }
  | { kind: 'survey' }
  | { kind: 'survey-done' }

type EffectiveStage =
  | LocalStage
  | { kind: 'waiting' }
  | { kind: 'driven'; exerciseId: string }
  | { kind: 'wrapped' }

type Props = {
  training: Training
  participant: Participant
  exercises: TrainingExerciseWithDef[]
  completedExerciseIds: string[]
  survey: Survey | null
  questions: SurveyQuestion[]
  initialSession: TrainingSession | null
}

const EXERCISE_BLURB: Record<ExerciseType, string> = {
  matching: 'Match items to their groups',
  quiz: 'A few multiple-choice questions',
  reflection: 'A short written reflection',
  word_cloud: 'Add words to the cloud',
  ranking: 'Rank in order',
  annotation: 'Tap to identify the right spots',
  scenario: 'A choose-your-own-adventure',
}

export function ParticipantFlow({
  training,
  participant,
  exercises,
  completedExerciseIds,
  survey,
  questions,
  initialSession,
}: Props) {
  const [localStage, setLocalStage] = useState<LocalStage>({ kind: 'hub' })

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

  const [session, setSession] = useState<TrainingSession | null>(initialSession)

  const trainerPaced = useMemo(
    () => exercises.filter((e) => e.pacing === 'trainer'),
    [exercises],
  )
  const selfPaced = useMemo(
    () => exercises.filter((e) => e.pacing !== 'trainer'),
    [exercises],
  )
  const allTrainerPaced =
    trainerPaced.length > 0 && selfPaced.length === 0 && !survey

  const hasSurvey = !!survey && questions.length > 0

  // Realtime subscription to the session row — drives the trainer-paced
  // flow. We drop the postgres_changes `filter` option and gate by
  // training_id client-side; with the `filter` set, the Wrap up event
  // wasn't reaching participants reliably and they got stuck on the
  // exercise screen. Hyphenated channel name (no colon) avoids a related
  // collision class.
  useEffect(() => {
    if (!initialSession) return
    const supabase = createClient()
    const channel = supabase
      .channel(`participant-session-${training.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_sessions' },
        (payload) => {
          const next = payload.new as TrainingSession | null
          if (next?.training_id === training.id && next.id) setSession(next)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [training.id, initialSession])

  function tapExercise(exerciseId: string) {
    if (completed.has(exerciseId)) {
      setLocalStage({ kind: 'exercise-done', exerciseId })
    } else {
      setStartedInSession((s) => new Set(s).add(exerciseId))
      setLocalStage({ kind: 'exercise', exerciseId })
    }
  }

  function tapSurvey() {
    if (surveyCompleted) {
      setLocalStage({ kind: 'survey-done' })
    } else {
      setSurveyStartedInSession(true)
      setLocalStage({ kind: 'survey' })
    }
  }

  function backToHub() {
    setLocalStage({ kind: 'hub' })
  }

  function onExerciseFinished(exerciseId: string) {
    setCompleted((s) => new Set(s).add(exerciseId))
    setStartedInSession((s) => {
      const next = new Set(s)
      next.delete(exerciseId)
      return next
    })
    setLocalStage({ kind: 'hub' })
  }

  function onSurveyFinished() {
    setSurveyCompleted(true)
    setSurveyStartedInSession(false)
    setLocalStage({ kind: 'hub' })
  }

  // The trainer's view trumps local state when a trainer-paced session is
  // live or wrapped. Otherwise we fall back to the local hub/exercise flow.
  const effectiveStage: EffectiveStage = useMemo(() => {
    if (session?.status === 'wrapped') {
      return { kind: 'wrapped' }
    }
    if (session?.status === 'live' && session.current_exercise_id) {
      const driven = trainerPaced.find((e) => e.id === session.current_exercise_id)
      if (driven) return { kind: 'driven', exerciseId: driven.id }
    }
    if (allTrainerPaced && session?.status === 'idle') {
      return { kind: 'waiting' }
    }
    return localStage
  }, [session, trainerPaced, allTrainerPaced, localStage])

  // Mark trainer-paced exercises completed when the participant's response
  // for the current driven exercise commits successfully. Local "completed"
  // tracking gives the hub the right pill state for mixed trainings.
  function onDrivenFinished(exerciseId: string) {
    setCompleted((s) => new Set(s).add(exerciseId))
  }

  // Build the hub activity list — only self-paced exercises go on the hub.
  const activities: HubActivity[] = selfPaced.map((ex) => ({
    id: ex.id,
    title: titleForExercise(ex),
    description: ex.description?.trim() || EXERCISE_BLURB[ex.type],
    completed: completed.has(ex.id),
    inProgress: startedInSession.has(ex.id) && !completed.has(ex.id),
    kind: ex.type,
    onTap: () => tapExercise(ex.id),
  }))
  if (hasSurvey) {
    activities.push({
      id: 'survey',
      title: 'Feedback',
      description: survey?.description?.trim() || 'Share your thoughts',
      completed: surveyCompleted,
      inProgress: surveyStartedInSession && !surveyCompleted,
      kind: 'survey',
      onTap: tapSurvey,
    })
  }

  const headerLabel = headerLabelFor(effectiveStage, exercises)
  const inActivity = effectiveStage.kind !== 'hub' && effectiveStage.kind !== 'waiting'
  const canBack =
    effectiveStage.kind === 'exercise' ||
    effectiveStage.kind === 'exercise-done' ||
    effectiveStage.kind === 'survey' ||
    effectiveStage.kind === 'survey-done'

  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur-md border-b border-ink/10">
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {canBack ? (
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
        Stage: {effectiveStage.kind}
      </div>

      <div key={stageKey(effectiveStage)} className="flex-1">
        {renderStage({
          stage: effectiveStage,
          training,
          participant,
          exercises,
          activities,
          survey,
          questions,
          onExerciseFinished,
          onDrivenFinished,
          onSurveyFinished,
          backToHub,
        })}
      </div>
    </main>
  )
}

function titleForExercise(ex: TrainingExerciseWithDef): string {
  if (
    ex.type === 'matching' &&
    typeof (ex.config as MatchingConfig).legacyIcebreakerId === 'string'
  ) {
    return 'Warm-up'
  }
  return ex.title || EXERCISE_TYPE_LABELS[ex.type]
}

function stageKey(stage: EffectiveStage): string {
  switch (stage.kind) {
    case 'hub':
      return 'hub'
    case 'waiting':
      return 'waiting'
    case 'wrapped':
      return 'wrapped'
    case 'survey':
      return 'survey'
    case 'survey-done':
      return 'survey-done'
    case 'driven':
      return `driven-${stage.exerciseId}`
    case 'exercise':
    case 'exercise-done':
      return `${stage.kind}-${stage.exerciseId}`
  }
}

function headerLabelFor(
  stage: EffectiveStage,
  exercises: TrainingExerciseWithDef[],
): string | null {
  if (stage.kind === 'hub' || stage.kind === 'waiting' || stage.kind === 'wrapped')
    return null
  if (stage.kind === 'survey' || stage.kind === 'survey-done') return 'Feedback'
  const ex = exercises.find(
    (e) =>
      'exerciseId' in stage && e.id === (stage as { exerciseId: string }).exerciseId,
  )
  if (!ex) return null
  if (ex.type === 'matching') return 'Warm-up'
  return EXERCISE_TYPE_LABELS[ex.type]
}

type StageRenderArgs = {
  stage: EffectiveStage
  training: Training
  participant: Participant
  exercises: TrainingExerciseWithDef[]
  activities: HubActivity[]
  survey: Survey | null
  questions: SurveyQuestion[]
  onExerciseFinished: (exerciseId: string) => void
  onDrivenFinished: (exerciseId: string) => void
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
    onDrivenFinished,
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

  if (stage.kind === 'waiting') {
    return <WaitingForTrainer />
  }

  if (stage.kind === 'wrapped') {
    return <Wrapped />
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

  if (stage.kind === 'exercise' || stage.kind === 'driven') {
    const driven = stage.kind === 'driven'
    const ex = exercises.find((e) => e.id === stage.exerciseId)
    if (!ex) {
      return driven ? (
        <WaitingForTrainer />
      ) : (
        <AlreadyCompleted onBack={backToHub} label="exercise" />
      )
    }
    const onDone = () =>
      driven ? onDrivenFinished(ex.id) : onExerciseFinished(ex.id)
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
    if (isWordCloudExercise(ex)) {
      return (
        <WordCloudPlayer
          training={training}
          participant={participant}
          exercise={ex as Exercise & { config: WordCloudConfig }}
          onComplete={onDone}
          hold={driven}
        />
      )
    }
    if (isRankingExercise(ex)) {
      return (
        <RankingPlayer
          training={training}
          participant={participant}
          exercise={ex as Exercise & { config: RankingConfig }}
          onComplete={onDone}
        />
      )
    }
    if (isAnnotationExercise(ex)) {
      return (
        <AnnotationPlayer
          training={training}
          participant={participant}
          exercise={ex as Exercise & { config: AnnotationConfig }}
          onComplete={onDone}
        />
      )
    }
    if (isScenarioExercise(ex)) {
      return (
        <ScenarioPlayer
          training={training}
          participant={participant}
          exercise={ex as Exercise & { config: ScenarioConfig }}
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

function WaitingForTrainer() {
  return (
    <div className="px-4 md:px-6 py-20 md:py-28 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md"
      >
        <div className="mx-auto mb-6 flex gap-1.5 justify-center">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-sage"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.18,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <h2 className="font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
          Waiting for the trainer to <span className="italic-sage">begin.</span>
        </h2>
        <p className="mt-3 text-ink/60 text-balance">
          When they start the session, the first activity will appear here.
        </p>
      </motion.div>
    </div>
  )
}

function Wrapped() {
  return (
    <div className="px-4 md:px-6 py-16 md:py-24 flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sage/15"
        >
          <Heart className="h-10 w-10 fill-sage text-sage" strokeWidth={1.5} />
        </motion.div>
        <h2 className="font-serif text-4xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
          Thank you for <span className="italic-sage">taking part.</span>
        </h2>
        <p className="mt-3 text-ink/60 text-balance">
          The session is wrapped. You can close this tab whenever you&rsquo;re ready.
        </p>
      </motion.div>
    </div>
  )
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
