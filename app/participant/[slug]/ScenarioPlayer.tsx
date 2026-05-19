'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Heart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type {
  Exercise,
  ScenarioConfig,
  ScenarioNode,
  ScenarioOutcome,
} from '@/lib/exercises'
import type { Training, Participant } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  training: Training
  participant: Participant
  exercise: Exercise & { config: ScenarioConfig }
  onComplete: () => void
}

const OUTCOME_TONE: Record<ScenarioOutcome, { tint: string; label: string }> = {
  positive: { tint: 'bg-sage/15 text-sage', label: 'Positive outcome' },
  neutral: { tint: 'bg-sand text-ink', label: 'Neutral outcome' },
  negative: { tint: 'bg-terracotta/15 text-terracotta', label: 'Negative outcome' },
}

export function ScenarioPlayer({
  training,
  participant,
  exercise,
  onComplete,
}: Props) {
  const config = exercise.config
  const nodeMap = useMemo(() => {
    const m = new Map<string, ScenarioNode>()
    for (const n of config.nodes ?? []) m.set(n.id, n)
    return m
  }, [config.nodes])

  const startNode = config.startNodeId ? nodeMap.get(config.startNodeId) ?? null : null

  const [currentId, setCurrentId] = useState<string | null>(startNode?.id ?? null)
  const [path, setPath] = useState<string[]>(startNode ? [startNode.id] : [])
  const [choicesMade, setChoicesMade] = useState<
    { nodeId: string; choiceIndex: number; choiceLabel: string }[]
  >([])
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = currentId ? nodeMap.get(currentId) ?? null : null

  function advance(toId: string | undefined, choice?: { index: number; label: string }) {
    if (!toId) return
    const next = nodeMap.get(toId)
    if (!next) return
    if (choice && currentId) {
      setChoicesMade((c) => [
        ...c,
        { nodeId: currentId, choiceIndex: choice.index, choiceLabel: choice.label },
      ])
    }
    setCurrentId(toId)
    setPath((p) => [...p, toId])
  }

  async function finish() {
    if (submitting || saved) return
    setSubmitting(true)
    setError(null)
    try {
      const outcome: ScenarioOutcome | null = current?.outcome ?? null
      const res = await fetch('/api/exercises/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingId: training.id,
          exerciseId: exercise.id,
          participantId: participant.id,
          response: {
            path,
            choices: choicesMade,
            finalOutcome: outcome,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || 'Could not save your path.')
      }
      setSubmitting(false)
      setSaved(true)
      window.setTimeout(() => onComplete(), 1500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (!startNode) {
    return (
      <div className="px-4 md:px-6 py-16 text-center">
        <p className="text-ink/70">This scenario hasn&rsquo;t been set up yet.</p>
        <Button onClick={onComplete} className="mt-6" variant="secondary">
          Back to activities
        </Button>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="px-4 md:px-6 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-md text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sage/15">
            <Heart className="h-10 w-10 fill-sage text-sage" strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
            Thanks for thinking that <span className="italic-sage">through.</span>
          </h2>
        </motion.div>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="px-4 md:px-6 py-8 md:py-12 pb-24">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Scenario · {exercise.title}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 rounded-2xl bg-white border border-ink/10 p-6 md:p-8"
          >
            {current.type === 'ending' && current.outcome && (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium mb-4',
                  OUTCOME_TONE[current.outcome].tint,
                )}
              >
                {OUTCOME_TONE[current.outcome].label}
              </span>
            )}
            <p className="font-serif text-xl md:text-2xl tracking-tightish text-ink leading-relaxed whitespace-pre-line text-balance">
              {current.content || <span className="italic text-ink/40">(empty)</span>}
            </p>

            {current.type === 'narrative' && (
              <div className="mt-6">
                <Button
                  onClick={() =>
                    advance(current.choices?.[0]?.nextNodeId, undefined)
                  }
                  disabled={!current.choices?.[0]?.nextNodeId}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {current.type === 'choice' && (
              <ul className="mt-6 space-y-2">
                {(current.choices ?? []).map((c, i) => (
                  <li key={i}>
                    <button
                      onClick={() =>
                        advance(c.nextNodeId, { index: i, label: c.label })
                      }
                      disabled={!c.nextNodeId}
                      className={cn(
                        'w-full text-left rounded-2xl border border-ink/15 bg-cream p-4 transition-all',
                        'hover:border-ink/30 hover:bg-sand/40 hover:shadow-soft',
                        'focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                      )}
                    >
                      <span className="font-medium text-ink">
                        {c.label || <span className="italic text-ink/40">(unnamed choice)</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {current.type === 'ending' && (
              <div className="mt-6">
                <Button size="lg" onClick={finish} disabled={submitting || saved}>
                  {submitting ? 'Saving…' : 'Wrap up'}
                </Button>
              </div>
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
