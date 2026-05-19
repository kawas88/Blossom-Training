'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { GripVertical, Plus, Trash2, X, Layers } from 'lucide-react'
import {
  EXERCISE_TYPE_LABELS,
  type Exercise,
  type ExerciseType,
  type TrainingExerciseWithDef,
} from '@/lib/exercises'
import type { Training } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

type Props = {
  training: Training
  trainingExercises: TrainingExerciseWithDef[]
  workspaceExercises: Exercise[]
}

const TYPE_TONE: Record<ExerciseType, string> = {
  matching: 'bg-domain-comm/15 text-domain-comm',
  quiz: 'bg-domain-problem/15 text-domain-problem',
  reflection: 'bg-sage/15 text-sage',
  word_cloud: 'bg-domain-fine/15 text-domain-fine',
  ranking: 'bg-domain-social/15 text-domain-social',
  annotation: 'bg-warn/15 text-warn',
  scenario: 'bg-ink/10 text-ink/70',
}

export function ExercisesTab({
  training,
  trainingExercises,
  workspaceExercises,
}: Props) {
  const router = useRouter()
  const [items, setItems] = useState<TrainingExerciseWithDef[]>(trainingExercises)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Re-sync the local list whenever the server-rendered prop changes — this
  // is what makes the visible list update after Add (the old code only
  // updated the parent's count via router.refresh(); the tab body kept its
  // initial-render state until a hard reload).
  useEffect(() => {
    setItems(trainingExercises)
  }, [trainingExercises])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const attachedIds = useMemo(
    () => new Set(items.map((i) => i.id)),
    [items],
  )
  const addableExercises = useMemo(
    () =>
      workspaceExercises.filter(
        (ex) => !attachedIds.has(ex.id),
      ),
    [workspaceExercises, attachedIds],
  )

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.link_id === active.id)
    const newIndex = items.findIndex((i) => i.link_id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(items, oldIndex, newIndex).map((item, i) => ({
      ...item,
      position: i,
    }))
    setItems(next)
    setError(null)
    try {
      const res = await fetch(`/api/admin/trainings/${training.id}/exercises`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: next.map((i) => ({ link_id: i.link_id, position: i.position })),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Could not save order')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save order')
      router.refresh()
    }
  }

  async function addExercise(exerciseId: string) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/trainings/${training.id}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise_id: exerciseId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Could not add exercise')
      }
      setShowAdd(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function removeExercise(linkId: string) {
    if (busy) return
    if (!confirm('Remove this exercise from the training? Responses will stay.'))
      return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/trainings/${training.id}/exercises/${linkId}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Could not remove exercise')
      }
      setItems((current) => current.filter((i) => i.link_id !== linkId))
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function toggleRequired(linkId: string, required: boolean) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/trainings/${training.id}/exercises/${linkId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ required }),
        },
      )
      if (!res.ok) throw new Error('Could not update')
      setItems((current) =>
        current.map((i) => (i.link_id === linkId ? { ...i, required } : i)),
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <p className="text-sm text-ink/70 max-w-xl">
          Drag to reorder. Each exercise appears as its own activity on the participant&rsquo;s hub, in the order shown here.
        </p>
        <Button onClick={() => setShowAdd(true)} disabled={busy}>
          <Plus className="h-4 w-4" />
          Add exercise
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="No exercises yet"
          description="Add one of your library exercises to get started — the participant's hub builds itself from this list."
          action={
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" />
              Add exercise
            </Button>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.link_id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {items.map((item) => (
                <SortableRow
                  key={item.link_id}
                  item={item}
                  onRequiredChange={(v) => toggleRequired(item.link_id, v)}
                  onRemove={() => removeExercise(item.link_id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {showAdd && (
        <AddExerciseModal
          exercises={addableExercises}
          onPick={addExercise}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function SortableRow({
  item,
  onRequiredChange,
  onRemove,
}: {
  item: TrainingExerciseWithDef
  onRequiredChange: (v: boolean) => void
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.link_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-white border border-ink/10 px-3 py-3',
        isDragging && 'shadow-card border-sage/40',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1.5 rounded-md text-ink/40 hover:text-ink hover:bg-sand/40 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className={cn(
          'rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider shrink-0',
          TYPE_TONE[item.type],
        )}
      >
        {EXERCISE_TYPE_LABELS[item.type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-ink/50 truncate">{item.description}</p>
        )}
      </div>
      <label className="hidden sm:flex items-center gap-2 text-xs text-ink/70 cursor-pointer">
        <input
          type="checkbox"
          checked={item.required}
          onChange={(e) => onRequiredChange(e.target.checked)}
          className="h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
        />
        Required
      </label>
      <Link
        href={`/admin/exercises/${item.id}`}
        className="text-xs text-ink/60 hover:text-ink hidden sm:inline"
      >
        Edit
      </Link>
      <button
        onClick={onRemove}
        className="p-1.5 text-ink/40 hover:text-error rounded-md"
        aria-label="Remove exercise"
        title="Remove from training"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}

function AddExerciseModal({
  exercises,
  onPick,
  onClose,
}: {
  exercises: Exercise[]
  onPick: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[80vh] rounded-2xl bg-cream shadow-card overflow-hidden flex flex-col">
        <header className="px-5 py-4 border-b border-ink/10 flex items-center justify-between">
          <h3 className="font-serif text-xl tracking-tightish text-ink">
            Add an exercise
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink/50 hover:text-ink hover:bg-sand/40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="overflow-y-auto p-3 flex-1">
          {exercises.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-ink/60">
                No more exercises to add. Build one in your{' '}
                <Link
                  href="/admin/exercises/new"
                  className="text-ink underline hover:text-sage"
                  onClick={onClose}
                >
                  exercise library
                </Link>{' '}
                first.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {exercises.map((ex) => (
                <li key={ex.id}>
                  <button
                    onClick={() => onPick(ex.id)}
                    className="w-full text-left rounded-xl border border-ink/10 bg-white p-4 hover:border-ink/30 hover:shadow-soft transition-all flex items-start gap-3"
                  >
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider shrink-0 mt-0.5',
                        TYPE_TONE[ex.type],
                      )}
                    >
                      {EXERCISE_TYPE_LABELS[ex.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink">{ex.title}</p>
                      {ex.description && (
                        <p className="mt-0.5 text-xs text-ink/60 line-clamp-2">
                          {ex.description}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
