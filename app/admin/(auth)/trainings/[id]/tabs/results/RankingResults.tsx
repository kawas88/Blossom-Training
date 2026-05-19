'use client'

import { useMemo } from 'react'
import type {
  ExerciseResponse,
  RankingConfig,
  RankingResponseShape,
  TrainingExerciseWithDef,
} from '@/lib/exercises'
import type { Participant } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  exercise: TrainingExerciseWithDef
  responses: ExerciseResponse[]
  participants: Participant[]
}

export function RankingResults({ exercise, responses, participants }: Props) {
  const config = exercise.config as RankingConfig
  const items = config.items ?? []
  const correct = config.correctOrder ?? null

  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  )

  // Average position per item across all responses (1-indexed). Lower = ranked higher.
  const avgPositions = useMemo(() => {
    const sums = new Map<string, { sum: number; count: number }>()
    for (const it of items) sums.set(it.id, { sum: 0, count: 0 })
    for (const r of responses) {
      const ranked = (r.response as RankingResponseShape | undefined)?.rankedOrder
      if (!Array.isArray(ranked)) continue
      ranked.forEach((id, i) => {
        const s = sums.get(id)
        if (s) {
          s.sum += i + 1
          s.count += 1
        }
      })
    }
    return items
      .map((it) => {
        const s = sums.get(it.id)!
        const avg = s.count === 0 ? null : s.sum / s.count
        return { item: it, avg, count: s.count }
      })
      .sort((a, b) => {
        if (a.avg === null) return 1
        if (b.avg === null) return -1
        return a.avg - b.avg
      })
  }, [items, responses])

  const total = responses.length
  const avgScore =
    correct && total > 0
      ? responses.reduce((s, r) => s + (r.score ?? 0), 0) / total
      : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Responses" value={String(total)} />
        <Stat label="Items ranked" value={String(items.length)} />
        {correct && avgScore !== null && (
          <Stat
            label="Avg correct positions"
            value={`${avgScore.toFixed(1)} / ${correct.length}`}
          />
        )}
      </div>

      {avgPositions.length > 0 && (
        <div className="rounded-2xl bg-white border border-ink/10 p-5">
          <h3 className="font-serif text-lg tracking-tightish text-ink mb-1">
            Average ranking
          </h3>
          <p className="text-xs text-ink/60 mb-3">
            Lower bar = ranked higher on average.
          </p>
          <ul className="space-y-2">
            {avgPositions.map((row, i) => {
              const pct =
                row.avg === null
                  ? 0
                  : Math.max(
                      5,
                      Math.round((1 - (row.avg - 1) / Math.max(1, items.length - 1)) * 100),
                    )
              return (
                <li key={row.item.id} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-ink/50 w-6 shrink-0">
                    {i + 1}.
                  </span>
                  <span className="flex-1 truncate text-ink">{row.item.label}</span>
                  <div className="flex-1 max-w-[180px] h-1.5 rounded-full bg-ink/5 overflow-hidden">
                    <div
                      className="h-full bg-sage rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-ink/60 w-20 text-right shrink-0">
                    {row.avg === null ? '—' : `avg #${row.avg.toFixed(1)}`}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink/10">
          <h3 className="font-serif text-lg tracking-tightish text-ink">
            Individual rankings
          </h3>
        </div>
        <ul className="divide-y divide-ink/5">
          {responses.map((r) => {
            const part = participantMap.get(r.participant_id)
            const ranked =
              (r.response as RankingResponseShape | undefined)?.rankedOrder ?? []
            const itemLabel = new Map(items.map((i) => [i.id, i.label]))
            return (
              <li key={r.id} className="px-5 py-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">
                    {part?.display_name?.trim() || (
                      <span className="italic text-ink/50">Anonymous</span>
                    )}
                  </span>
                  {correct && (
                    <span className="font-mono text-xs text-ink/60">
                      {r.score ?? 0} / {correct.length} correct
                    </span>
                  )}
                </div>
                <ol className="flex flex-wrap gap-1.5 text-xs">
                  {ranked.map((id, i) => {
                    const isCorrect = correct && correct[i] === id
                    return (
                      <li
                        key={`${r.id}-${id}-${i}`}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                          isCorrect
                            ? 'bg-success/10 text-success'
                            : correct
                            ? 'bg-terracotta/10 text-terracotta'
                            : 'bg-ink/5 text-ink/70',
                        )}
                      >
                        <span className="font-mono">{i + 1}.</span>
                        <span>{itemLabel.get(id) ?? '—'}</span>
                      </li>
                    )
                  })}
                </ol>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl tracking-tightish text-ink">{value}</p>
    </div>
  )
}
