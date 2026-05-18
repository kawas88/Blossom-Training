'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'
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
import { Button } from '@/components/ui/Button'
import { MatchingIcebreaker } from './MatchingIcebreaker'
import { PromptsIcebreaker } from './PromptsIcebreaker'
import { SurveyForm } from './SurveyForm'
import { ActivityHub, type HubActivity } from './ActivityHub'

type Stage =
  | 'hub'
  | 'icebreaker'
  | 'survey'
  | 'icebreaker-done'
  | 'survey-done'

type Props = {
  training: Training
  participant: Participant
  icebreaker: Icebreaker | null
  categories: IcebreakerCategory[]
  items: IcebreakerItem[]
  prompts: IcebreakerPrompt[]
  survey: Survey | null
  questions: SurveyQuestion[]
}

export function ParticipantFlow({
  training,
  participant,
  icebreaker,
  categories,
  items,
  prompts,
  survey,
  questions,
}: Props) {
  const [stage, setStage] = useState<Stage>('hub')

  const [iceCompleted, setIceCompleted] = useState<boolean>(
    !!participant.icebreaker_completed_at,
  )
  const [surveyCompleted, setSurveyCompleted] = useState<boolean>(
    !!participant.survey_completed_at,
  )

  // "In progress" is purely client-side: did the participant open the activity
  // in this session and not yet finish it.
  const [iceStartedInSession, setIceStartedInSession] = useState<boolean>(false)
  const [surveyStartedInSession, setSurveyStartedInSession] = useState<boolean>(false)

  const hasIcebreaker =
    !!icebreaker &&
    ((icebreaker.format === 'matching' && items.length > 0) ||
      (icebreaker.format === 'prompts' && prompts.length > 0))
  const hasSurvey = !!survey && questions.length > 0

  function tapIcebreaker() {
    if (iceCompleted) {
      setStage('icebreaker-done')
    } else {
      setIceStartedInSession(true)
      setStage('icebreaker')
    }
  }

  function tapSurvey() {
    if (surveyCompleted) {
      setStage('survey-done')
    } else {
      setSurveyStartedInSession(true)
      setStage('survey')
    }
  }

  function backToHub() {
    setStage('hub')
  }

  function onIceFinished() {
    setIceCompleted(true)
    setIceStartedInSession(false)
    setStage('hub')
  }

  function onSurveyFinished() {
    setSurveyCompleted(true)
    setSurveyStartedInSession(false)
    setStage('hub')
  }

  // Build the activity list — future activities can be appended here.
  const activities: HubActivity[] = []
  if (hasIcebreaker && icebreaker) {
    activities.push({
      key: 'icebreaker',
      title: 'Warm-up',
      description:
        icebreaker.format === 'matching'
          ? 'Match milestones to age groups'
          : 'A few quick reflection prompts',
      completed: iceCompleted,
      inProgress: iceStartedInSession && !iceCompleted,
      icon: 'sparkles',
      onTap: tapIcebreaker,
    })
  }
  if (hasSurvey) {
    activities.push({
      key: 'survey',
      title: 'Feedback',
      description: 'Share your thoughts on the ASQ-3',
      completed: surveyCompleted,
      inProgress: surveyStartedInSession && !surveyCompleted,
      icon: 'clipboard',
      onTap: tapSurvey,
    })
  }

  const headerLabel = stageLabel(stage)
  const inActivity = stage !== 'hub'

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
        Stage: {stage}
      </div>

      {/*
        Each stage owns its own motion.div so AnimatePresence can preserve
        the outgoing stage's full content during exit (otherwise inner
        conditionals re-evaluate against the new stage and the outgoing
        wrapper renders empty — which produced a blank-screen flash
        between Warm-up submit and Hub mount).
      */}
      <AnimatePresence mode="wait">
        {stage === 'hub' && (
          <motion.div
            key="hub"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1"
          >
            <ActivityHub
              activities={activities}
              participantName={participant.display_name}
            />
          </motion.div>
        )}

        {stage === 'icebreaker' &&
          icebreaker &&
          icebreaker.format === 'matching' && (
            <motion.div
              key="icebreaker-matching"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1"
            >
              <MatchingIcebreaker
                training={training}
                participant={participant}
                icebreaker={icebreaker}
                categories={categories}
                items={items}
                onComplete={onIceFinished}
              />
            </motion.div>
          )}

        {stage === 'icebreaker' &&
          icebreaker &&
          icebreaker.format === 'prompts' && (
            <motion.div
              key="icebreaker-prompts"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1"
            >
              <PromptsIcebreaker
                training={training}
                participant={participant}
                icebreaker={icebreaker}
                prompts={prompts}
                onComplete={onIceFinished}
              />
            </motion.div>
          )}

        {stage === 'survey' && survey && (
          <motion.div
            key="survey"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1"
          >
            <SurveyForm
              training={training}
              participant={participant}
              survey={survey}
              questions={questions}
              onComplete={onSurveyFinished}
            />
          </motion.div>
        )}

        {stage === 'icebreaker-done' && (
          <motion.div
            key="icebreaker-done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1"
          >
            <AlreadyCompleted onBack={backToHub} label="warm-up" />
          </motion.div>
        )}
        {stage === 'survey-done' && (
          <motion.div
            key="survey-done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1"
          >
            <AlreadyCompleted onBack={backToHub} label="feedback" />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

function stageLabel(stage: Stage): string | null {
  switch (stage) {
    case 'icebreaker':
      return 'Warm-up'
    case 'survey':
      return 'Feedback'
    case 'icebreaker-done':
      return 'Warm-up'
    case 'survey-done':
      return 'Feedback'
    default:
      return null
  }
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
          Your {label} responses are safe with us.
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
