'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Trash2 } from 'lucide-react'
import {
  EXERCISE_TYPE_LABELS,
  type Exercise,
  type ExerciseType,
} from '@/lib/exercises'
import { Pill } from '@/components/ui/Pill'
import { formatDate, cn } from '@/lib/utils'

const TYPE_TONE: Record<ExerciseType, string> = {
  matching: 'bg-domain-comm/15 text-domain-comm',
  quiz: 'bg-domain-problem/15 text-domain-problem',
  reflection: 'bg-sage/15 text-sage',
  word_cloud: 'bg-domain-fine/15 text-domain-fine',
  ranking: 'bg-domain-social/15 text-domain-social',
  annotation: 'bg-warn/15 text-warn',
  scenario: 'bg-ink/10 text-ink/70',
}

export function ExercisesGrid({ exercises }: { exercises: Exercise[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function duplicate(id: string) {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/exercises/${id}/duplicate`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not duplicate')
      router.push(`/admin/exercises/${data.exercise.id}`)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setBusyId(null)
    }
  }

  async function remove(id: string) {
    if (busyId) return
    if (!confirm('Delete this exercise? This cannot be undone.')) return
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/exercises/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || data.error || 'Could not delete')
      }
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
          {error}
        </div>
      )}
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {exercises.map((ex) => (
          <li
            key={ex.id}
            className="rounded-2xl bg-white border border-ink/10 p-5 flex flex-col"
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider',
                  TYPE_TONE[ex.type],
                )}
              >
                {EXERCISE_TYPE_LABELS[ex.type]}
              </span>
              <Pill variant="default" className="text-[10px]">
                {formatDate(ex.created_at)}
              </Pill>
            </div>
            <h3 className="mt-3 font-serif text-xl tracking-tightish text-ink leading-snug">
              {ex.title}
            </h3>
            {ex.description && (
              <p className="mt-1 text-sm text-ink/60 line-clamp-2">{ex.description}</p>
            )}
            <div className="mt-auto pt-4 flex items-center justify-between">
              <Link
                href={`/admin/exercises/${ex.id}`}
                className="text-sm text-ink hover:underline"
              >
                Edit →
              </Link>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => duplicate(ex.id)}
                  disabled={busyId === ex.id}
                  className="p-1.5 text-ink/40 hover:text-ink rounded-md hover:bg-sand/40 disabled:opacity-50"
                  aria-label="Duplicate"
                  title="Duplicate"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(ex.id)}
                  disabled={busyId === ex.id}
                  className="p-1.5 text-ink/40 hover:text-error rounded-md hover:bg-error/5 disabled:opacity-50"
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
