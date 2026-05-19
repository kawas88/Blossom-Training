'use client'

import { useMemo } from 'react'
import type {
  ExerciseResponse,
  ScenarioConfig,
  ScenarioOutcome,
  ScenarioResponseShape,
  TrainingExerciseWithDef,
} from '@/lib/exercises'
import type { Participant } from '@/lib/types'
import { cn, truncate } from '@/lib/utils'

type Props = {
  exercise: TrainingExerciseWithDef
  responses: ExerciseResponse[]
  participants: Participant[]
}

const OUTCOME_TONE: Record<ScenarioOutcome | 'unknown', { tint: string; label: string }> = {
  positive: { tint: 'bg-sage/15 text-sage', label: 'Positive' },
  neutral: { tint: 'bg-sand text-ink', label: 'Neutral' },
  negative: { tint: 'bg-terracotta/15 text-terracotta', label: 'Negative' },
  unknown: { tint: 'bg-ink/10 text-ink/60', label: 'No outcome' },
}

export function ScenarioResults({
  exercise,
  responses,
  participants,
}: Props) {
  const config = exercise.config as ScenarioConfig
  const nodeMap = useMemo(() => {
    const m = new Map<string, (typeof config.nodes)[number]>()
    for (const n of config.nodes ?? []) m.set(n.id, n)
    return m
  }, [config.nodes])
  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  )

  // Outcome distribution
  const outcomeCounts: Record<ScenarioOutcome | 'unknown', number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
    unknown: 0,
  }
  for (const r of responses) {
    const o = (r.response as ScenarioResponseShape | undefined)?.finalOutcome
    if (o === 'positive' || o === 'neutral' || o === 'negative') outcomeCounts[o]++
    else outcomeCounts.unknown++
  }

  // Most-common path (as a stringified path key)
  const pathCounts = useMemo(() => {
    const m = new Map<string, { count: number; path: string[] }>()
    for (const r of responses) {
      const path = (r.response as ScenarioResponseShape | undefined)?.path ?? []
      const key = path.join('>')
      const e = m.get(key)
      if (e) e.count++
      else m.set(key, { count: 1, path })
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count)
  }, [responses])

  const total = responses.length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Stat label="Responses" value={String(total)} />
        <OutcomeStat
          label="Positive"
          count={outcomeCounts.positive}
          total={total}
          tone="bg-sage"
        />
        <OutcomeStat
          label="Neutral"
          count={outcomeCounts.neutral}
          total={total}
          tone="bg-sand"
        />
        <OutcomeStat
          label="Negative"
          count={outcomeCounts.negative}
          total={total}
          tone="bg-terracotta"
        />
      </div>

      {pathCounts.length > 0 && (
        <div className="rounded-2xl bg-white border border-ink/10 p-5">
          <h3 className="font-serif text-lg tracking-tightish text-ink mb-1">
            Most common paths
          </h3>
          <p className="text-xs text-ink/60 mb-4">
            How participants worked their way through the scenario.
          </p>
          <ul className="space-y-2">
            {pathCounts.slice(0, 5).map((p, i) => (
              <li
                key={i}
                className={cn(
                  'rounded-xl border px-3 py-2.5',
                  i === 0
                    ? 'border-sage/40 bg-sage/5'
                    : 'border-ink/10 bg-cream/40',
                )}
              >
                <div className="flex items-center justify-between text-xs text-ink/60 mb-1.5">
                  <span className="font-mono uppercase tracking-wider">
                    Path {i + 1}
                  </span>
                  <span className="font-mono">
                    {p.count} {p.count === 1 ? 'participant' : 'participants'}
                  </span>
                </div>
                <ol className="flex flex-wrap items-center gap-1.5 text-sm">
                  {p.path.map((id, idx) => {
                    const node = nodeMap.get(id)
                    const label =
                      node?.content?.trim() || node?.type || '(missing node)'
                    return (
                      <li key={`${i}-${idx}`} className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs',
                            node?.type === 'ending'
                              ? OUTCOME_TONE[node.outcome ?? 'unknown'].tint
                              : 'bg-ink/5 text-ink/80',
                          )}
                        >
                          {truncate(label, 36)}
                        </span>
                        {idx < p.path.length - 1 && (
                          <span className="text-ink/30">→</span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink/10">
          <h3 className="font-serif text-lg tracking-tightish text-ink">
            Individual paths
          </h3>
        </div>
        <ul className="divide-y divide-ink/5">
          {responses.map((r) => {
            const part = participantMap.get(r.participant_id)
            const data = r.response as ScenarioResponseShape | undefined
            const outcome = (data?.finalOutcome ?? 'unknown') as
              | ScenarioOutcome
              | 'unknown'
            const tone = OUTCOME_TONE[outcome]
            return (
              <li
                key={r.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">
                    {part?.display_name?.trim() || (
                      <span className="italic text-ink/50">Anonymous</span>
                    )}
                  </p>
                  <p className="text-xs text-ink/55 truncate">
                    {(data?.choices ?? [])
                      .map((c) => c.choiceLabel)
                      .filter(Boolean)
                      .join(' → ') || 'Linear path'}
                  </p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium shrink-0',
                    tone.tint,
                  )}
                >
                  {tone.label}
                </span>
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

function OutcomeStat({
  label,
  count,
  total,
  tone,
}: {
  label: string
  count: number
  total: number
  tone: string
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-serif text-3xl tracking-tightish text-ink">{count}</span>
        <span className="text-sm text-ink/50">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-ink/5 overflow-hidden">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
