'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { MatchingIcebreaker } from './MatchingIcebreaker'
import { PromptsIcebreaker } from './PromptsIcebreaker'
import { SurveyForm } from './SurveyForm'
import { ThankYou } from './ThankYou'

type Stage = 'icebreaker' | 'survey' | 'done'

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
  const initialStage: Stage = useMemo(() => {
    if (participant.survey_completed_at) return 'done'
    if (
      participant.icebreaker_completed_at ||
      !icebreaker ||
      (icebreaker.format === 'matching' && items.length === 0) ||
      (icebreaker.format === 'prompts' && prompts.length === 0)
    ) {
      if (!survey || questions.length === 0) return 'done'
      return 'survey'
    }
    return 'icebreaker'
  }, [participant, icebreaker, items, prompts, survey, questions])

  const [stage, setStage] = useState<Stage>(initialStage)

  const stepLabel = (() => {
    if (stage === 'icebreaker') return 'Warm-up'
    if (stage === 'survey') return 'Feedback'
    return 'Done'
  })()

  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur-md border-b border-ink/10">
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 hidden sm:block">
              NTH
            </div>
            <div className="hidden sm:block w-px h-4 bg-ink/15" />
            <div className="truncate font-serif text-base md:text-lg text-ink tracking-tightish">
              {training.title}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={
                stage === 'icebreaker'
                  ? 'font-medium text-ink'
                  : 'text-ink/40 line-through decoration-1'
              }
            >
              Warm-up
            </span>
            <span className="text-ink/30">→</span>
            <span
              className={
                stage === 'survey'
                  ? 'font-medium text-ink'
                  : stage === 'done'
                  ? 'text-ink/40 line-through decoration-1'
                  : 'text-ink/40'
              }
            >
              Feedback
            </span>
          </div>
        </div>
      </header>

      <div className="sr-only" aria-live="polite">
        Stage: {stepLabel}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1"
        >
          {stage === 'icebreaker' && icebreaker && icebreaker.format === 'matching' && (
            <MatchingIcebreaker
              training={training}
              participant={participant}
              icebreaker={icebreaker}
              categories={categories}
              items={items}
              onComplete={() => {
                if (survey && questions.length > 0) setStage('survey')
                else setStage('done')
              }}
            />
          )}
          {stage === 'icebreaker' && icebreaker && icebreaker.format === 'prompts' && (
            <PromptsIcebreaker
              training={training}
              participant={participant}
              icebreaker={icebreaker}
              prompts={prompts}
              onComplete={() => {
                if (survey && questions.length > 0) setStage('survey')
                else setStage('done')
              }}
            />
          )}
          {stage === 'survey' && survey && (
            <SurveyForm
              training={training}
              participant={participant}
              survey={survey}
              questions={questions}
              onComplete={() => setStage('done')}
            />
          )}
          {stage === 'done' && <ThankYou />}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
