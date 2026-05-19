'use client'

import { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import type {
  ExerciseResponse,
  QuizConfig,
  QuizResponseShape,
  TrainingExerciseWithDef,
} from '@/lib/exercises'
import type { Participant } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  exercise: TrainingExerciseWithDef
  responses: ExerciseResponse[]
  participants: Participant[]
}

export function QuizResults({ exercise, responses, participants }: Props) {
  const config = exercise.config as QuizConfig
  const questions = config.questions ?? []
  const total = responses.length

  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  )

  const totalCorrect = responses.reduce((sum, r) => sum + (r.score ?? 0), 0)
  const maxScore = questions.length
  const avgScore = total === 0 ? 0 : totalCorrect / total
  const avgPct = maxScore === 0 ? 0 : Math.round((avgScore / maxScore) * 100)

  // Score distribution: buckets of scoreValue → count of participants
  const distribution = useMemo(() => {
    const buckets = new Array(maxScore + 1).fill(0) as number[]
    for (const r of responses) {
      const s = Math.max(0, Math.min(maxScore, Math.round(r.score ?? 0)))
      buckets[s] += 1
    }
    return buckets
  }, [responses, maxScore])

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Stat label="Responses" value={String(total)} />
        <Stat
          label="Average score"
          value={`${avgScore.toFixed(1)} / ${maxScore}`}
          sub={`${avgPct}%`}
        />
        <Stat
          label="Top score"
          value={String(Math.max(0, ...responses.map((r) => r.score ?? 0)))}
          sub={`out of ${maxScore}`}
        />
      </div>

      {/* Score distribution */}
      {maxScore > 0 && total > 0 && (
        <div className="rounded-2xl bg-white border border-ink/10 p-5">
          <h3 className="font-serif text-lg tracking-tightish text-ink mb-3">
            Score distribution
          </h3>
          <div className="space-y-1.5">
            {distribution.map((count, score) => {
              const pct = total === 0 ? 0 : Math.round((count / total) * 100)
              return (
                <div
                  key={score}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="font-mono text-xs text-ink/60 w-12 shrink-0">
                    {score} / {maxScore}
                  </span>
                  <div className="flex-1 h-5 rounded-full bg-ink/5 overflow-hidden">
                    <div
                      className="h-full bg-sage rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-ink/60 w-16 text-right shrink-0">
                    {count} {pct > 0 && `(${pct}%)`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Per-question breakdown */}
      <div className="space-y-3">
        <h3 className="font-serif text-xl tracking-tightish text-ink">
          By <span className="italic-sage">question.</span>
        </h3>
        {questions.map((q, qi) => {
          const optionCounts = q.options.map((_, optIdx) => {
            return responses.filter((r) => {
              const ans = (r.response as QuizResponseShape | undefined)?.answers
              return ans?.[q.id] === optIdx
            }).length
          })
          const correctCount = optionCounts[q.correctIndex] ?? 0
          const correctPct = total === 0 ? 0 : Math.round((correctCount / total) * 100)

          return (
            <div
              key={q.id}
              className="rounded-2xl bg-white border border-ink/10 p-5"
            >
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs text-ink/50 mt-1">
                  {String.fromCharCode(65 + qi)}.
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif text-lg tracking-tightish text-ink leading-snug">
                    {q.prompt || '(no prompt)'}
                  </h4>
                  <p className="mt-1 text-xs text-ink/60">
                    <span className="font-medium text-sage">{correctCount}</span> of{' '}
                    {total} got this correct ({correctPct}%)
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {q.options.map((opt, oi) => {
                  const count = optionCounts[oi] ?? 0
                  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
                  const isCorrect = oi === q.correctIndex
                  return (
                    <li
                      key={oi}
                      className={cn(
                        'rounded-xl border px-3 py-2',
                        isCorrect
                          ? 'bg-success/5 border-success/30'
                          : 'bg-cream/50 border-ink/10',
                      )}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-mono shrink-0',
                            isCorrect
                              ? 'bg-success text-white'
                              : 'bg-ink/10 text-ink/70',
                          )}
                        >
                          {isCorrect ? (
                            <Check className="h-3 w-3" strokeWidth={2.5} />
                          ) : (
                            String.fromCharCode(65 + oi)
                          )}
                        </span>
                        <span className="flex-1 truncate text-ink">
                          {opt || <span className="text-ink/40">(empty)</span>}
                        </span>
                        <span className="font-mono text-xs text-ink/60 shrink-0">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-ink/5 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            isCorrect ? 'bg-success' : 'bg-ink/30',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Per-participant table */}
      <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink/10">
          <h3 className="font-serif text-lg tracking-tightish text-ink">
            Participants
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sand/30 text-left text-xs font-mono uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-5 py-2.5">Name</th>
                <th className="px-5 py-2.5 text-right">Score</th>
                {questions.map((_q, qi) => (
                  <th
                    key={qi}
                    className="px-2 py-2.5 text-center w-10"
                    title={`Question ${String.fromCharCode(65 + qi)}`}
                  >
                    {String.fromCharCode(65 + qi)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {[...responses]
                .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                .map((r) => {
                  const part = participantMap.get(r.participant_id)
                  const answers =
                    (r.response as QuizResponseShape | undefined)?.answers ?? {}
                  return (
                    <tr key={r.id}>
                      <td className="px-5 py-3">
                        {part?.display_name ? (
                          <span className="font-medium text-ink">
                            {part.display_name}
                          </span>
                        ) : (
                          <span className="italic text-ink/50">Anonymous</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono">
                        {r.score ?? 0} / {maxScore}
                      </td>
                      {questions.map((q, qi) => {
                        const choice = answers[q.id]
                        const isCorrect = choice === q.correctIndex
                        const letter =
                          typeof choice === 'number'
                            ? String.fromCharCode(65 + choice)
                            : '—'
                        return (
                          <td
                            key={qi}
                            className="px-2 py-3 text-center"
                          >
                            <span
                              className={cn(
                                'inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-mono font-medium',
                                typeof choice !== 'number'
                                  ? 'bg-ink/5 text-ink/40'
                                  : isCorrect
                                  ? 'bg-success/15 text-success'
                                  : 'bg-terracotta/15 text-terracotta',
                              )}
                              title={
                                typeof choice === 'number'
                                  ? `Chose ${letter}${isCorrect ? ' (correct)' : ` — correct was ${String.fromCharCode(65 + q.correctIndex)}`}`
                                  : 'No answer'
                              }
                            >
                              {typeof choice === 'number' ? (
                                isCorrect ? (
                                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                ) : (
                                  letter
                                )
                              ) : (
                                '—'
                              )}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-serif text-3xl tracking-tightish text-ink">
          {value}
        </span>
        {sub && <span className="text-sm text-ink/50">{sub}</span>}
      </div>
    </div>
  )
}
