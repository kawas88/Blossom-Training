'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import type {
  Icebreaker,
  IcebreakerCategory,
  IcebreakerItem,
  Training,
  Participant,
} from '@/lib/types'
import { Button } from '@/components/ui/Button'

type Props = {
  training: Training
  participant: Participant
  icebreaker: Icebreaker
  categories: IcebreakerCategory[]
  items: IcebreakerItem[]
  onComplete: () => void
}

type ItemState = {
  itemId: string
  placedCategoryId: string | null // when correctly placed
  firstAttemptCategoryId: string | null
  attempts: number
  wasCorrect: boolean
}

type Toast = {
  id: number
  text: string
  variant: 'success' | 'error'
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function MatchingIcebreaker({
  training,
  participant,
  icebreaker,
  categories,
  items,
  onComplete,
}: Props) {
  // Stable randomized order
  const shuffled = useMemo(() => shuffle(items), [items])

  const [states, setStates] = useState<Record<string, ItemState>>(() => {
    const out: Record<string, ItemState> = {}
    for (const it of items) {
      out[it.id] = {
        itemId: it.id,
        placedCategoryId: null,
        firstAttemptCategoryId: null,
        attempts: 0,
        wasCorrect: false,
      }
    }
    return out
  })

  const [selected, setSelected] = useState<string | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(true)

  const placedCount = Object.values(states).filter((s) => s.wasCorrect).length
  const allDone = placedCount === items.length && items.length > 0

  function pushToast(text: string, variant: Toast['variant']) {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, variant }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 1800)
  }

  function tapItem(itemId: string) {
    if (states[itemId].wasCorrect) return
    setSelected((curr) => (curr === itemId ? null : itemId))
  }

  function tapCategory(categoryId: string) {
    if (!selected) return
    const item = items.find((i) => i.id === selected)
    if (!item) return
    const correct = item.correct_category_id === categoryId

    setStates((prev) => {
      const cur = prev[selected]
      const isFirst = cur.attempts === 0
      return {
        ...prev,
        [selected]: {
          ...cur,
          attempts: cur.attempts + 1,
          firstAttemptCategoryId: isFirst ? categoryId : cur.firstAttemptCategoryId,
          placedCategoryId: correct ? categoryId : cur.placedCategoryId,
          wasCorrect: correct ? true : cur.wasCorrect,
        },
      }
    })

    if (correct) {
      pushToast('Correct!', 'success')
      setSelected(null)
    } else {
      pushToast('Try a different age group', 'error')
      setShakeId(selected)
      setSelected(null)
      setTimeout(() => setShakeId(null), 500)
    }
  }

  // Domain legend
  const legend = useMemo(() => {
    const map = new Map<string, string>()
    for (const it of items) {
      if (it.tag_label && it.tag_color && !map.has(it.tag_label)) {
        map.set(it.tag_label, it.tag_color)
      }
    }
    return Array.from(map.entries()).map(([label, color]) => ({ label, color }))
  }, [items])

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const responses = Object.values(states).map((s) => ({
        item_id: s.itemId,
        first_attempt_category_id: s.firstAttemptCategoryId,
        was_correct: s.wasCorrect,
        attempts: Math.max(1, s.attempts),
      }))
      const res = await fetch('/api/responses/icebreaker-matching', {
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

  // Group placed items per category
  const placedByCategory = useMemo(() => {
    const map: Record<string, IcebreakerItem[]> = {}
    for (const c of categories) map[c.id] = []
    for (const it of items) {
      const s = states[it.id]
      if (s?.wasCorrect && s.placedCategoryId) {
        map[s.placedCategoryId]?.push(it)
      }
    }
    return map
  }, [categories, items, states])

  if (allDone) {
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
            Brilliant — <span className="italic-sage">all matched!</span>
          </h2>
          <p className="mt-4 text-ink/70 text-balance">
            Tap save to lock in your placements and head back to your activities.
          </p>
          {error && (
            <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}
          <div className="mt-8">
            <Button size="lg" onClick={submit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save and return →'}
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <LayoutGroup>
      <div className="px-3 md:px-6 py-6 md:py-8 pb-32">
        <div className="mx-auto max-w-5xl">
          {/* Heading + progress */}
          <div className="mb-4">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
              Warm-up
            </p>
            <h1 className="mt-1 font-serif text-2xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
              {icebreaker.title}
            </h1>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-ink/60 mb-1.5 font-mono">
              <span>
                {placedCount} / {items.length} placed
              </span>
              <span>
                {Math.round((placedCount / Math.max(1, items.length)) * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
              <motion.div
                className="h-full bg-sage"
                initial={false}
                animate={{ width: `${(placedCount / Math.max(1, items.length)) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* Instructions (collapsible) */}
          {showInstructions && icebreaker.instructions && (
            <div className="mb-5 rounded-2xl bg-white border border-ink/10 p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-ink/70 leading-relaxed">
                  {icebreaker.instructions}
                </p>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="shrink-0 text-xs text-ink/50 hover:text-ink underline"
                  aria-label="Hide instructions"
                >
                  Got it
                </button>
              </div>
            </div>
          )}

          {/* Card bank */}
          <section className="mb-6">
            <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 mb-2">
              Milestone cards
            </h2>
            <div className="rounded-2xl bg-white border border-ink/10 p-3 md:p-4 min-h-[88px]">
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {shuffled
                    .filter((it) => !states[it.id]?.wasCorrect)
                    .map((it) => {
                      const isSelected = selected === it.id
                      const isShaking = shakeId === it.id
                      return (
                        <motion.button
                          key={it.id}
                          layout
                          layoutId={`item-${it.id}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{
                            opacity: 1,
                            scale: isSelected ? 1.05 : 1,
                          }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{
                            duration: 0.3,
                            ease: [0.16, 1, 0.3, 1],
                            layout: { duration: 0.4 },
                          }}
                          onClick={() => tapItem(it.id)}
                          className={[
                            'group inline-flex items-center gap-2 rounded-full px-3 py-2 text-left text-sm transition-colors min-h-[44px]',
                            'border focus:outline-none focus-visible:ring-4',
                            isSelected
                              ? 'bg-ink text-cream border-ink shadow-card focus-visible:ring-sage/30'
                              : 'bg-cream text-ink border-ink/15 hover:bg-sand/50 focus-visible:ring-ink/20',
                            isShaking && 'animate-shake',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {it.tag_color && (
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: it.tag_color }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="leading-snug">{it.text}</span>
                        </motion.button>
                      )
                    })}
                </AnimatePresence>
              </div>

              {/* Domain legend */}
              {legend.length > 0 && (
                <div className="mt-3 pt-3 border-t border-ink/10 flex flex-wrap gap-x-4 gap-y-1.5">
                  {legend.map((l) => (
                    <div
                      key={l.label}
                      className="inline-flex items-center gap-1.5 text-[11px] text-ink/60"
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      <span>{l.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Categories grid */}
          <section>
            <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 mb-2">
              Age groups
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((c) => {
                const isTarget = !!selected
                const placed = placedByCategory[c.id] || []
                return (
                  <motion.button
                    key={c.id}
                    layout
                    onClick={() => tapCategory(c.id)}
                    disabled={!selected}
                    className={[
                      'text-left rounded-2xl border bg-white p-4 transition-all',
                      'min-h-[140px] flex flex-col',
                      isTarget
                        ? 'border-sage shadow-soft cursor-pointer animate-pulse-soft'
                        : 'border-ink/10 cursor-default',
                    ].join(' ')}
                  >
                    <div className="font-serif text-lg tracking-tightish text-ink">
                      {c.label}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <AnimatePresence>
                        {placed.map((it) => (
                          <motion.span
                            key={it.id}
                            layout
                            layoutId={`item-${it.id}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/30 px-2 py-1 text-xs text-success"
                          >
                            <Check className="h-3 w-3" strokeWidth={2.5} />
                            <span className="text-ink/80 line-clamp-1">{it.text}</span>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </section>
        </div>

        {/* Toasts */}
        <div className="fixed inset-x-0 bottom-6 z-40 pointer-events-none flex flex-col items-center gap-2 px-4">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={[
                  'pointer-events-auto rounded-full px-5 py-2.5 text-sm font-medium shadow-card',
                  t.variant === 'success'
                    ? 'bg-success text-white'
                    : 'bg-error text-white',
                ].join(' ')}
              >
                {t.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </LayoutGroup>
  )
}
