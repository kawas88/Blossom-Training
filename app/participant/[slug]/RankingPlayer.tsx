'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type {
  Exercise,
  RankingConfig,
  RankingItem,
} from '@/lib/exercises'
import type { Training, Participant } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  training: Training
  participant: Participant
  exercise: Exercise & { config: RankingConfig }
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

export function RankingPlayer({
  training,
  participant,
  exercise,
  onComplete,
}: Props) {
  const config = exercise.config
  const items = config.items ?? []
  const initial = useMemo(
    () => (config.presentationOrder === 'fixed' ? items : shuffle(items)),
    [items, config.presentationOrder],
  )

  const [order, setOrder] = useState<RankingItem[]>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = order.findIndex((i) => i.id === active.id)
    const newIdx = order.findIndex((i) => i.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    setOrder((c) => arrayMove(c, oldIdx, newIdx))
  }

  async function submit() {
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
          response: { rankedOrder: order.map((i) => i.id) },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || 'Could not save your ranking.')
      }
      setSubmitting(false)
      setSaved(true)
      if (config.showCorrectAfterSubmit && config.correctOrder) {
        setReveal(true)
        // Give them time to compare, then advance.
        window.setTimeout(() => onComplete(), 4000)
      } else {
        window.setTimeout(() => onComplete(), 1500)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="px-4 md:px-6 py-16 text-center">
        <p className="text-ink/70">This ranking exercise has no items yet.</p>
        <Button onClick={onComplete} className="mt-6" variant="secondary">
          Back to activities
        </Button>
      </div>
    )
  }

  if (reveal && config.correctOrder) {
    return (
      <RankingReveal
        order={order}
        correct={config.correctOrder}
        items={items}
      />
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
            <Sparkles className="h-10 w-10 text-sage" strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
            Thanks — your ranking is <span className="italic-sage">in.</span>
          </h2>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 py-8 md:py-12 pb-24">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Ranking
        </p>
        <h1 className="mt-1 font-serif text-3xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
          {exercise.title}
        </h1>
        {config.prompt && (
          <p className="mt-3 text-ink/70 text-balance">{config.prompt}</p>
        )}

        <div className="mt-8">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={order.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="space-y-2">
                {order.map((it, i) => (
                  <SortableRow key={it.id} item={it} position={i + 1} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="mt-6">
          <Button size="lg" onClick={submit} disabled={submitting || saved}>
            {submitting ? 'Saving…' : 'Lock in my ranking →'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SortableRow({
  item,
  position,
}: {
  item: RankingItem
  position: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-ink/10 bg-white px-3 py-3',
        isDragging && 'shadow-card border-sage/40',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="p-1.5 rounded-md text-ink/40 hover:text-ink hover:bg-sand/40 cursor-grab active:cursor-grabbing mt-1"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="font-mono text-xs text-ink/50 w-6 mt-2">{position}.</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink">{item.label}</p>
        {item.description && (
          <p className="mt-0.5 text-sm text-ink/60">{item.description}</p>
        )}
      </div>
    </li>
  )
}

function RankingReveal({
  order,
  correct,
  items,
}: {
  order: RankingItem[]
  correct: string[]
  items: RankingItem[]
}) {
  const labelMap = new Map(items.map((i) => [i.id, i.label]))
  return (
    <div className="px-4 md:px-6 py-8 md:py-12 pb-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Compared
        </p>
        <h2 className="mt-1 font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
          Your ranking vs the <span className="italic-sage">correct one.</span>
        </h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="rounded-2xl bg-white border border-ink/10 p-4">
            <h3 className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 mb-2">
              You
            </h3>
            <ol className="space-y-1.5">
              {order.map((it, i) => {
                const isCorrect = correct[i] === it.id
                return (
                  <li
                    key={it.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm',
                      isCorrect ? 'bg-success/10' : 'bg-ink/5',
                    )}
                  >
                    <span className="font-mono text-xs text-ink/50 w-5">
                      {i + 1}.
                    </span>
                    <span className="flex-1 truncate text-ink">{it.label}</span>
                    {isCorrect ? (
                      <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
                    ) : (
                      <X className="h-3.5 w-3.5 text-ink/30" />
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
          <div className="rounded-2xl bg-white border border-sage/30 p-4">
            <h3 className="font-mono text-[10px] tracking-[0.2em] uppercase text-sage mb-2">
              Correct
            </h3>
            <ol className="space-y-1.5">
              {correct.map((id, i) => (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-ink/50 w-5">
                    {i + 1}.
                  </span>
                  <span className="flex-1 truncate text-ink">
                    {labelMap.get(id) ?? '—'}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
