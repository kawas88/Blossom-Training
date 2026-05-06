'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type {
  Icebreaker,
  IcebreakerPrompt,
  Training,
  Participant,
} from '@/lib/types'
import { Button } from '@/components/ui/Button'

type Props = {
  training: Training
  participant: Participant
  icebreaker: Icebreaker
  prompts: IcebreakerPrompt[]
  onComplete: () => void
}

export function PromptsIcebreaker({
  training,
  participant,
  icebreaker,
  prompts,
  onComplete,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allAnswered = prompts.every((p) => (answers[p.id] || '').trim().length > 0)

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/responses/icebreaker-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          training_id: training.id,
          participant_id: participant.id,
          responses: prompts.map((p) => ({
            prompt_id: p.id,
            answer: (answers[p.id] || '').trim(),
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not save answers.')
      }
      onComplete()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="px-4 md:px-6 py-8 md:py-12 pb-24">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Warm-up
        </p>
        <h1 className="mt-1 font-serif text-3xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
          {icebreaker.title}
        </h1>
        {icebreaker.instructions && (
          <p className="mt-3 text-ink/70">{icebreaker.instructions}</p>
        )}

        <div className="mt-8 space-y-4">
          {prompts.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl bg-white border border-ink/10 p-5"
            >
              <label
                htmlFor={`p-${p.id}`}
                className="block font-serif text-lg tracking-tightish text-ink"
              >
                <span className="font-mono text-xs text-ink/50 mr-2">
                  {String.fromCharCode(65 + i)}.
                </span>
                {p.prompt}
              </label>
              <div className="mt-3">
                {p.answer_type === 'long_text' ? (
                  <textarea
                    id={`p-${p.id}`}
                    rows={4}
                    maxLength={3000}
                    value={answers[p.id] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [p.id]: e.target.value })
                    }
                    className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-base focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20 resize-y"
                  />
                ) : (
                  <input
                    id={`p-${p.id}`}
                    type="text"
                    maxLength={p.answer_type === 'word' ? 30 : 300}
                    value={answers[p.id] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [p.id]: e.target.value })
                    }
                    className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-base focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20"
                  />
                )}
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
          <Button size="lg" onClick={submit} disabled={!allAnswered || submitting}>
            {submitting ? 'Saving…' : 'Continue →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
