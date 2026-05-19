'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type {
  AgeGroup,
  Exercise,
  MatchingConfig,
  Milestone,
} from '@/lib/exercises'
import type { Training, Participant } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type Props = {
  training: Training
  participant: Participant
  exercise: Exercise & { config: MatchingConfig }
  onComplete: () => void
}

type ItemState = {
  itemId: string
  placedCategoryId: string | null
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

export function MatchingPlayer({
  training,
  participant,
  exercise,
  onComplete,
}: Props) {
  const categories: AgeGroup[] = exercise.config.ageGroups ?? []
  const items: Milestone[] = exercise.config.milestones ?? []
  const correctPlacements = exercise.config.correctPlacements ?? {}

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

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(true)

  const placedCount = Object.values(states).filter((s) => s.wasCorrect).length
  const allDone = placedCount === items.length && items.length > 0

  // ---------------------------------------------------------------------
  // Drag sensors. PointerSensor with a 4px activation distance avoids
  // accidental drags on touch; TouchSensor with a short hold delay keeps
  // taps responsive on mobile.
  // ---------------------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 6 } }),
  )

  // Pre-build maps for fast lookups during drag events.
  const itemMap = useMemo(() => {
    const m = new Map<string, Milestone>()
    for (const it of items) m.set(it.id, it)
    return m
  }, [items])

  function pushToast(text: string, variant: Toast['variant']) {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, variant }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1800)
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id))
    setOverId(null)
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const itemId = String(event.active.id)
    const overCategory = event.over ? String(event.over.id) : null
    setDraggingId(null)
    setOverId(null)

    if (!overCategory) return // dropped outside any droppable — no-op
    const correctCategoryId = correctPlacements[itemId]
    if (!correctCategoryId) return
    const correct = correctCategoryId === overCategory

    setStates((prev) => {
      const cur = prev[itemId]
      const isFirst = cur.attempts === 0
      return {
        ...prev,
        [itemId]: {
          ...cur,
          attempts: cur.attempts + 1,
          firstAttemptCategoryId: isFirst ? overCategory : cur.firstAttemptCategoryId,
          placedCategoryId: correct ? overCategory : cur.placedCategoryId,
          wasCorrect: correct ? true : cur.wasCorrect,
        },
      }
    })

    if (correct) {
      pushToast('Nice match!', 'success')
    } else {
      pushToast('Try a different age group', 'error')
      setShakeId(itemId)
      setTimeout(() => setShakeId(null), 500)
    }
  }

  // Domain legend
  const legend = useMemo(() => {
    const map = new Map<string, string>()
    for (const it of items) {
      if (it.tagLabel && it.tagColor && !map.has(it.tagLabel)) {
        map.set(it.tagLabel, it.tagColor)
      }
    }
    return Array.from(map.entries()).map(([label, color]) => ({ label, color }))
  }, [items])

  async function submit() {
    if (submitting || saved) return
    setSubmitting(true)
    setError(null)
    try {
      const placements: Record<string, string | null> = {}
      const firstAttempts: Record<string, string> = {}
      const attempts: Record<string, number> = {}
      for (const s of Object.values(states)) {
        placements[s.itemId] = s.wasCorrect ? s.placedCategoryId : null
        firstAttempts[s.itemId] = s.firstAttemptCategoryId ?? ''
        attempts[s.itemId] = Math.max(1, s.attempts)
      }
      const res = await fetch('/api/exercises/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingId: training.id,
          exerciseId: exercise.id,
          participantId: participant.id,
          response: { placements, firstAttempts, attempts },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || 'Could not save responses.')
      }
      setSubmitting(false)
      setSaved(true)
      window.setTimeout(() => onComplete(), 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const placedByCategory = useMemo(() => {
    const map: Record<string, Milestone[]> = {}
    for (const c of categories) map[c.id] = []
    for (const it of items) {
      const s = states[it.id]
      if (s?.wasCorrect && s.placedCategoryId) {
        map[s.placedCategoryId]?.push(it)
      }
    }
    return map
  }, [categories, items, states])

  // Compute the "drop hint" state for each category given the currently
  // dragged milestone. This drives the shake / pulse / tint visuals.
  function hintFor(categoryId: string): 'correct' | 'wrong' | 'none' {
    if (!draggingId) return 'none'
    if (overId !== categoryId) return 'none'
    const correct = correctPlacements[draggingId] === categoryId
    return correct ? 'correct' : 'wrong'
  }

  const draggingItem = draggingId ? itemMap.get(draggingId) ?? null : null

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
            <Button
              size="lg"
              onClick={submit}
              disabled={submitting || saved}
            >
              {saved ? 'Saved ✓' : submitting ? 'Saving…' : 'Save and return →'}
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDraggingId(null)
        setOverId(null)
      }}
    >
      <div className="px-3 md:px-6 py-6 md:py-8 pb-32">
        <div className="mx-auto max-w-6xl">
          {/* Header + progress */}
          <div className="mb-4">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
              Warm-up
            </p>
            <h1 className="mt-1 font-serif text-2xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
              {exercise.title}
            </h1>
          </div>

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
                animate={{
                  width: `${(placedCount / Math.max(1, items.length)) * 100}%`,
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {showInstructions && exercise.config.instructions && (
            <div className="mb-5 rounded-2xl bg-white border border-ink/10 p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-ink/70 leading-relaxed">
                  {exercise.config.instructions}
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

          {/*
            Side-by-side on tablet/desktop, stacked on mobile.
            Left: milestones bank. Right: age-group drop targets.
          */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            {/* Milestones bank */}
            <section>
              <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 mb-2">
                Drag a milestone →
              </h2>
              <div className="rounded-2xl bg-white border border-ink/10 p-3 md:p-4 min-h-[140px]">
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {shuffled
                      .filter((it) => !states[it.id]?.wasCorrect)
                      .map((it) => (
                        <DraggableMilestone
                          key={it.id}
                          milestone={it}
                          isShaking={shakeId === it.id}
                          isDragging={draggingId === it.id}
                        />
                      ))}
                  </AnimatePresence>
                </div>

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

            {/* Age-group drop targets */}
            <section>
              <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 mb-2">
                ← Into the right age group
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map((c) => (
                  <DroppableCategory
                    key={c.id}
                    category={c}
                    hint={hintFor(c.id)}
                    placedItems={placedByCategory[c.id] || []}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Drag preview — what the user sees attached to the cursor/finger */}
        <DragOverlay dropAnimation={null}>
          {draggingItem ? (
            <span
              className="inline-flex items-center gap-2 rounded-full bg-ink text-cream border border-ink shadow-card px-3 py-2 text-sm pointer-events-none"
              style={{ transform: 'rotate(-2deg)' }}
            >
              {draggingItem.tagColor && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: draggingItem.tagColor }}
                />
              )}
              <span className="leading-snug">{draggingItem.text}</span>
            </span>
          ) : null}
        </DragOverlay>

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
                className={cn(
                  'pointer-events-auto rounded-full px-5 py-2.5 text-sm font-medium shadow-card',
                  t.variant === 'success' ? 'bg-success text-white' : 'bg-error text-white',
                )}
              >
                {t.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </DndContext>
  )
}

// ---------------------------------------------------------------------
// Draggable milestone card
// ---------------------------------------------------------------------
function DraggableMilestone({
  milestone,
  isShaking,
  isDragging,
}: {
  milestone: Milestone
  isShaking: boolean
  isDragging: boolean
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: milestone.id,
  })
  return (
    <motion.button
      ref={setNodeRef}
      layout
      layoutId={`item-${milestone.id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: isDragging ? 0.3 : 1,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-2 text-left text-sm transition-colors min-h-[44px]',
        'border bg-cream text-ink border-ink/15',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/20',
        'cursor-grab active:cursor-grabbing touch-none select-none',
        isShaking && 'animate-shake',
      )}
      {...attributes}
      {...listeners}
    >
      {milestone.tagColor && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: milestone.tagColor }}
          aria-hidden="true"
        />
      )}
      <span className="leading-snug">{milestone.text}</span>
    </motion.button>
  )
}

// ---------------------------------------------------------------------
// Droppable age-group card. Shakes if the currently-dragged milestone
// doesn't belong here; pulses + tints sage if it does.
// ---------------------------------------------------------------------
function DroppableCategory({
  category,
  hint,
  placedItems,
}: {
  category: AgeGroup
  hint: 'correct' | 'wrong' | 'none'
  placedItems: Milestone[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: category.id })
  return (
    <motion.div
      ref={setNodeRef}
      layout
      className={cn(
        'text-left rounded-2xl border bg-white p-3 md:p-4 transition-all min-h-[110px] flex flex-col',
        hint === 'correct' &&
          'border-sage shadow-card animate-pulse-soft scale-[1.02]',
        hint === 'wrong' && 'border-error/60 animate-shake',
        hint === 'none' && (isOver ? 'border-ink/30' : 'border-ink/10'),
      )}
      style={{
        backgroundColor:
          hint === 'correct'
            ? 'rgba(29, 110, 82, 0.06)'
            : hint === 'wrong'
            ? 'rgba(239, 68, 68, 0.04)'
            : undefined,
      }}
    >
      <div className="font-serif text-base md:text-lg tracking-tightish text-ink">
        {category.label}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <AnimatePresence>
          {placedItems.map((it) => (
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
    </motion.div>
  )
}
