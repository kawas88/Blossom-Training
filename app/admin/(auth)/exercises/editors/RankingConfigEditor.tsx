'use client'

import {
  DndContext,
  PointerSensor,
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
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import type { RankingConfig, RankingItem } from '@/lib/exercises'
import { cn } from '@/lib/utils'

type Props = {
  config: RankingConfig
  onChange: (next: RankingConfig) => void
}

function uid() {
  return 'r_' + Math.random().toString(36).slice(2, 10)
}

export function RankingConfigEditor({ config, onChange }: Props) {
  const items = config.items ?? []
  const correctOrder = config.correctOrder ?? null
  const hasCorrect = !!correctOrder

  function updateItems(next: RankingItem[]) {
    // Keep correctOrder in sync if items are removed.
    let order = correctOrder
    if (order) {
      const ids = new Set(next.map((i) => i.id))
      order = order.filter((id) => ids.has(id))
      for (const i of next) if (!order.includes(i.id)) order.push(i.id)
    }
    onChange({ ...config, items: next, correctOrder: order ?? undefined })
  }

  function addItem() {
    updateItems([
      ...items,
      { id: uid(), label: '', description: '' },
    ])
  }

  function patchItem(id: string, patch: Partial<RankingItem>) {
    updateItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  function removeItem(id: string) {
    updateItems(items.filter((it) => it.id !== id))
  }

  function setHasCorrect(v: boolean) {
    onChange({
      ...config,
      correctOrder: v ? items.map((i) => i.id) : undefined,
      showCorrectAfterSubmit: v ? config.showCorrectAfterSubmit : false,
    })
  }

  function setCorrectOrder(next: string[]) {
    onChange({ ...config, correctOrder: next })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-ink/10 p-6 space-y-5">
        <Textarea
          label="Prompt"
          value={config.prompt}
          onChange={(e) => onChange({ ...config, prompt: e.target.value })}
          rows={2}
          placeholder="e.g. Rank these classroom values from most to least important."
          required
          maxLength={300}
        />
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Initial order shown to participants
          </label>
          <div className="inline-flex rounded-full bg-cream border border-ink/15 p-1 text-xs font-medium">
            {(['shuffled', 'fixed'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ ...config, presentationOrder: mode })}
                className={cn(
                  'rounded-full px-3 py-1.5 transition-colors',
                  config.presentationOrder === mode
                    ? 'bg-ink text-cream'
                    : 'text-ink/70 hover:text-ink',
                )}
              >
                {mode === 'shuffled' ? 'Shuffled' : 'Fixed (as I created)'}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasCorrect}
            onChange={(e) => setHasCorrect(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
          />
          <span className="text-sm">
            <span className="block font-medium text-ink">
              There&rsquo;s a correct order
            </span>
            <span className="block text-xs text-ink/60">
              Turn on for sequence-style exercises (e.g. &ldquo;put these steps in order&rdquo;). Leave off for opinion-gathering.
            </span>
          </span>
        </label>
        {hasCorrect && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showCorrectAfterSubmit}
              onChange={(e) =>
                onChange({ ...config, showCorrectAfterSubmit: e.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
            />
            <span className="text-sm">
              <span className="block font-medium text-ink">
                Show the correct order after submission
              </span>
              <span className="block text-xs text-ink/60">
                Participants see a side-by-side of their ranking and the correct one.
              </span>
            </span>
          </label>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg tracking-tightish text-ink">Items</h3>
          <Button type="button" variant="secondary" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" />
            Add item
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-ink/60">
            No items yet — add the things participants will rank.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((it, i) => (
              <li
                key={it.id}
                className="rounded-xl border border-ink/10 p-3 grid gap-2 md:grid-cols-[2fr_3fr_36px]"
              >
                <span className="hidden md:flex items-center gap-2 text-xs text-ink/40 font-mono">
                  {i + 1}.
                </span>
                <div className="md:col-span-1">
                  <Input
                    value={it.label}
                    onChange={(e) => patchItem(it.id, { label: e.target.value })}
                    placeholder="Item label"
                  />
                </div>
                <div className="md:col-span-1">
                  <Input
                    value={it.description ?? ''}
                    onChange={(e) =>
                      patchItem(it.id, { description: e.target.value })
                    }
                    placeholder="Optional description"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  className="p-1.5 text-ink/40 hover:text-error self-center justify-self-center"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasCorrect && correctOrder && correctOrder.length > 0 && (
        <div className="rounded-2xl bg-white border border-ink/10 p-6">
          <h3 className="font-serif text-lg tracking-tightish text-ink">
            Correct order
          </h3>
          <p className="mt-1 text-sm text-ink/60">
            Drag to set the right sequence. Most important / first at the top.
          </p>
          <CorrectOrderEditor
            order={correctOrder}
            items={items}
            onChange={setCorrectOrder}
          />
        </div>
      )}
    </div>
  )
}

function CorrectOrderEditor({
  order,
  items,
  onChange,
}: {
  order: string[]
  items: RankingItem[]
  onChange: (next: string[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const labelMap = new Map(items.map((i) => [i.id, i.label]))
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = order.findIndex((id) => id === active.id)
    const newIdx = order.findIndex((id) => id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    onChange(arrayMove(order, oldIdx, newIdx))
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ol className="mt-3 space-y-2">
          {order.map((id, i) => (
            <SortableCorrectRow
              key={id}
              id={id}
              position={i + 1}
              label={labelMap.get(id) || '(no label)'}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

function SortableCorrectRow({
  id,
  position,
  label,
}: {
  id: string
  position: number
  label: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-ink/10 bg-cream/40 px-3 py-2',
        isDragging && 'shadow-card border-sage/40',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="p-1 rounded-md text-ink/40 hover:text-ink hover:bg-sand/40 cursor-grab active:cursor-grabbing"
        aria-label="Drag"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="font-mono text-xs text-ink/50 w-6">{position}.</span>
      <span className="text-sm text-ink">{label}</span>
    </li>
  )
}
