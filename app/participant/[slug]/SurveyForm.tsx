'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import type {
  Survey,
  SurveyQuestion,
  Training,
  Participant,
  QuestionType,
} from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type Props = {
  training: Training
  participant: Participant
  survey: Survey
  questions: SurveyQuestion[]
  onComplete: () => void
}

function staticOptionsFor(type: QuestionType): string[] | null {
  switch (type) {
    case 'yes_no':
      return ['Yes', 'No']
    case 'yes_no_notreally':
      return ['Yes', 'No', 'Not really']
    case 'yes_no_sometimes':
      return ['Yes', 'No', 'Sometimes']
    default:
      return null
  }
}

export function SurveyForm({
  training,
  participant,
  survey,
  questions,
  onComplete,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiredOk = useMemo(() => {
    return questions
      .filter((q) => q.required)
      .every((q) => (answers[q.id] || '').toString().trim().length > 0)
  }, [questions, answers])

  function setAnswer(questionId: string, value: string) {
    setAnswers((a) => ({ ...a, [questionId]: value }))
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const responses = Object.entries(answers)
        .filter(([, v]) => (v || '').toString().trim().length > 0)
        .map(([question_id, answer]) => ({ question_id, answer }))
      const res = await fetch('/api/responses/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          training_id: training.id,
          participant_id: participant.id,
          responses,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not save responses.')
      }
      onComplete()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="px-4 md:px-6 py-8 md:py-12 pb-32">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Feedback
        </p>
        <h1 className="mt-1 font-serif text-3xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
          {survey.title}
        </h1>
        {survey.description && (
          <p className="mt-3 text-ink/70 text-balance">{survey.description}</p>
        )}

        <div className="mt-8 space-y-4">
          {questions.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl bg-white border border-ink/10 p-5"
            >
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs text-ink/50 mt-1">
                  {String.fromCharCode(65 + i)}.
                </span>
                <label
                  htmlFor={`q-${q.id}`}
                  className="font-serif text-lg tracking-tightish text-ink leading-snug"
                >
                  {q.question}
                  {!q.required && (
                    <span className="ml-2 text-xs font-sans text-ink/50">
                      (optional)
                    </span>
                  )}
                </label>
              </div>

              <div className="mt-4">
                <QuestionInput
                  q={q}
                  value={answers[q.id] || ''}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="mt-6">
          <Button size="lg" onClick={submit} disabled={!requiredOk || submitting}>
            {submitting ? 'Saving…' : 'Submit feedback →'}
          </Button>
          {!requiredOk && (
            <p className="mt-2 text-xs text-ink/50">
              Please answer all required questions to submit.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: SurveyQuestion
  value: string
  onChange: (v: string) => void
}) {
  const options = staticOptionsFor(q.question_type) || q.options || []

  if (
    q.question_type === 'yes_no' ||
    q.question_type === 'yes_no_notreally' ||
    q.question_type === 'yes_no_sometimes' ||
    q.question_type === 'multiple_choice'
  ) {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all border',
                selected
                  ? 'bg-ink text-cream border-ink scale-[1.04]'
                  : 'bg-cream text-ink border-ink/15 hover:bg-sand/40',
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>
    )
  }

  if (q.question_type === 'rating_5') {
    const rating = parseInt(value, 10) || 0
    return (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(String(n))}
            className="p-1 rounded-md hover:bg-sand/40 transition-colors"
            aria-label={`${n} out of 5`}
          >
            <Star
              className={cn(
                'h-7 w-7 transition-colors',
                n <= rating ? 'fill-warn text-warn' : 'text-ink/20',
              )}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-ink/60 font-mono">{rating}/5</span>
        )}
      </div>
    )
  }

  if (q.question_type === 'rating_10') {
    const rating = parseInt(value, 10) || 0
    return (
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const filled = n <= rating
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className={cn(
                'h-9 w-9 rounded-lg text-sm font-medium font-mono transition-all border',
                filled
                  ? 'bg-sage text-cream border-sage'
                  : 'bg-white text-ink/70 border-ink/15 hover:bg-sand/40',
              )}
            >
              {n}
            </button>
          )
        })}
      </div>
    )
  }

  if (q.question_type === 'short_text') {
    return (
      <input
        id={`q-${q.id}`}
        type="text"
        value={value}
        maxLength={300}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-base focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
      />
    )
  }

  // long_text
  return (
    <textarea
      id={`q-${q.id}`}
      rows={4}
      maxLength={3000}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-base focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20 resize-y"
    />
  )
}
