'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Sparkles } from 'lucide-react'
import type { Exercise, QuizConfig, QuizQuestion } from '@/lib/exercises'
import type { Training, Participant } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type Props = {
  training: Training
  participant: Participant
  exercise: Exercise & { config: QuizConfig }
  onComplete: () => void
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function QuizPlayer({
  training,
  participant,
  exercise,
  onComplete,
}: Props) {
  const config = exercise.config
  const questions: QuizQuestion[] = useMemo(
    () => (config.shuffleQuestions ? shuffle(config.questions) : config.questions),
    [config.questions, config.shuffleQuestions],
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [selectedNow, setSelectedNow] = useState<number | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const totalCorrect = useMemo(
    () => questions.filter((q) => answers[q.id] === q.correctIndex).length,
    [questions, answers],
  )

  function chooseAnswer(optionIdx: number) {
    if (revealing || selectedNow !== null) return
    setSelectedNow(optionIdx)
    const next = { ...answers, [current.id]: optionIdx }
    setAnswers(next)

    if (config.showCorrectAfterEach) {
      setRevealing(true)
      window.setTimeout(() => advance(next), 1500)
    } else {
      window.setTimeout(() => advance(next), 250)
    }
  }

  function advance(latestAnswers: Record<string, number>) {
    setRevealing(false)
    setSelectedNow(null)
    if (isLast) {
      finish(latestAnswers)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  async function finish(latestAnswers: Record<string, number>) {
    if (submitting || saved) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/exercises/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingId: training.id,
          exerciseId: exercise.id,
          participantId: participant.id,
          response: { answers: latestAnswers },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || 'Could not save responses.')
      }
      setSubmitting(false)
      setSaved(true)
      window.setTimeout(() => onComplete(), 1500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (questions.length === 0) {
    return (
      <div className="px-4 md:px-6 py-16 md:py-24 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-ink/70">This quiz has no questions yet.</p>
          <Button onClick={onComplete} className="mt-6">
            Back to activities
          </Button>
        </div>
      </div>
    )
  }

  if (saved || (submitting && isLast)) {
    return (
      <div className="px-4 md:px-6 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-md text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sage/15">
            <Sparkles className="h-10 w-10 text-sage" strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-4xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
            All <span className="italic-sage">done!</span>
          </h2>
          <p className="mt-4 text-ink/70">
            You got <span className="font-medium text-ink">{totalCorrect} / {questions.length}</span>.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 py-8 md:py-12 pb-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
            Quiz · {exercise.title}
          </p>
          <div className="mt-3 flex justify-between text-xs text-ink/60 mb-1.5 font-mono">
            <span>
              Question {currentIndex + 1} / {questions.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
            <motion.div
              className="h-full bg-sage"
              initial={false}
              animate={{
                width: `${((currentIndex + (selectedNow !== null ? 1 : 0)) / questions.length) * 100}%`,
              }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl bg-white border border-ink/10 p-6"
          >
            <h2 className="font-serif text-2xl md:text-3xl tracking-tightish text-ink leading-tight text-balance">
              {current.prompt || '(no prompt set)'}
            </h2>
            <ul className="mt-6 space-y-3">
              {current.options.map((opt, i) => {
                const isSelected = selectedNow === i
                const isCorrect =
                  revealing && config.showCorrectAfterEach && i === current.correctIndex
                const isWrongPick =
                  revealing &&
                  config.showCorrectAfterEach &&
                  isSelected &&
                  i !== current.correctIndex

                return (
                  <li key={i}>
                    <button
                      onClick={() => chooseAnswer(i)}
                      disabled={revealing || selectedNow !== null}
                      className={cn(
                        'w-full text-left rounded-2xl border p-4 min-h-[60px] transition-all',
                        'flex items-center gap-3',
                        'focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30',
                        'disabled:cursor-default',
                        isCorrect
                          ? 'bg-success/10 border-success/40 text-ink'
                          : isWrongPick
                          ? 'bg-error/10 border-error/40 text-ink'
                          : isSelected
                          ? 'bg-ink text-cream border-ink'
                          : 'bg-cream text-ink border-ink/15 hover:border-ink/30 hover:bg-sand/40',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono',
                          isCorrect
                            ? 'bg-success text-white'
                            : isWrongPick
                            ? 'bg-error text-white'
                            : isSelected
                            ? 'bg-cream text-ink'
                            : 'bg-ink/10 text-ink/70',
                        )}
                      >
                        {isCorrect ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        ) : isWrongPick ? (
                          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                        ) : (
                          String.fromCharCode(65 + i)
                        )}
                      </span>
                      <span className="flex-1 text-base leading-snug">
                        {opt || <span className="text-ink/40">(empty option)</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {revealing && config.showCorrectAfterEach && (
              <p className="mt-5 text-sm text-center font-medium">
                {selectedNow === current.correctIndex ? (
                  <span className="text-success">Correct!</span>
                ) : (
                  <span className="text-error">Not quite — here&rsquo;s the right answer.</span>
                )}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
