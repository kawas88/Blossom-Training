'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type {
  Icebreaker,
  IcebreakerCategory,
  IcebreakerItem,
  IcebreakerPrompt,
  IcebreakerMatchingResponse,
  IcebreakerPromptResponse,
  Participant,
} from '@/lib/types'
import { truncate } from '@/lib/utils'

type Props = {
  icebreaker: Icebreaker | null
  categories: IcebreakerCategory[]
  items: IcebreakerItem[]
  prompts: IcebreakerPrompt[]
  matchingResponses: IcebreakerMatchingResponse[]
  promptResponses: IcebreakerPromptResponse[]
  participants: Participant[]
}

export function IcebreakerTab(props: Props) {
  const { icebreaker } = props

  if (!icebreaker) {
    return (
      <div className="rounded-2xl bg-white border border-ink/10 p-8 text-center text-ink/60">
        No icebreaker linked to this training.
      </div>
    )
  }

  if (icebreaker.format === 'matching') return <MatchingResults {...props} />
  return <PromptsResults {...props} />
}

function MatchingResults({
  categories,
  items,
  matchingResponses,
  participants,
}: Props) {
  // Stats
  const completed = participants.filter((p) => !!p.icebreaker_completed_at).length
  const totalPlacements = matchingResponses.length

  const itemMap = new Map(items.map((i) => [i.id, i]))
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  // Per-item stats
  const perItem = items
    .map((item) => {
      const responsesForItem = matchingResponses.filter((r) => r.item_id === item.id)
      const total = responsesForItem.length
      const correctFirst = responsesForItem.filter(
        (r) => r.first_attempt_category_id === item.correct_category_id,
      ).length
      const accuracy = total === 0 ? null : Math.round((correctFirst / total) * 100)

      // Most-common wrong first attempt
      const wrongCounts = new Map<string, number>()
      for (const r of responsesForItem) {
        if (
          r.first_attempt_category_id &&
          r.first_attempt_category_id !== item.correct_category_id
        ) {
          wrongCounts.set(
            r.first_attempt_category_id,
            (wrongCounts.get(r.first_attempt_category_id) || 0) + 1,
          )
        }
      }
      let topWrong: { categoryId: string; count: number } | null = null
      for (const [k, v] of wrongCounts) {
        if (!topWrong || v > topWrong.count) topWrong = { categoryId: k, count: v }
      }
      return {
        item,
        total,
        correctFirst,
        accuracy,
        topWrong,
      }
    })
    .filter((r) => r.total > 0)

  const avgAccuracy =
    perItem.length === 0
      ? 0
      : Math.round(
          perItem.reduce((s, r) => s + (r.accuracy ?? 0), 0) / perItem.length,
        )

  const chartData = [...perItem]
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
    .map((r) => ({
      name: truncate(r.item.text, 50),
      accuracy: r.accuracy ?? 0,
      color: r.item.tag_color || '#1D6E52',
    }))

  // Per-participant scoreboard
  const scoreboard = participants
    .filter((p) => !!p.icebreaker_completed_at)
    .map((p) => {
      const rs = matchingResponses.filter((r) => r.participant_id === p.id)
      const correctFirst = rs.filter(
        (r) => r.first_attempt_category_id === itemMap.get(r.item_id)?.correct_category_id,
      ).length
      return {
        id: p.id,
        name: p.display_name,
        correctFirst,
        total: rs.length,
      }
    })
    .sort((a, b) => b.correctFirst - a.correctFirst)

  // Mistakes list
  const mistakes = perItem
    .filter((r) => r.topWrong)
    .map((r) => ({
      item: r.item,
      correct: categoryMap.get(r.item.correct_category_id || ''),
      wrong: categoryMap.get(r.topWrong!.categoryId),
      count: r.topWrong!.count,
    }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Stat label="Completed" value={completed} />
        <Stat label="Avg first-try accuracy" value={`${avgAccuracy}%`} />
        <Stat label="Total placements" value={totalPlacements} />
      </div>

      {chartData.length > 0 && (
        <div className="rounded-2xl bg-white border border-ink/10 p-5">
          <h3 className="font-serif text-lg tracking-tightish text-ink mb-1">
            Milestone difficulty
          </h3>
          <p className="text-xs text-ink/60 mb-4">
            Trickiest items at top — based on first-try accuracy.
          </p>
          <div style={{ width: '100%', height: chartData.length * 36 + 60 }}>
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 0, right: 30, top: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#0F141910" strokeDasharray="2 4" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: '#0F1419', fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={240}
                  tick={{ fill: '#0F1419', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => `${v}%`}
                  contentStyle={{
                    background: '#FAF7F2',
                    border: '1px solid rgba(15,20,25,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="accuracy" radius={[4, 4, 4, 4]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {mistakes.length > 0 && (
        <div className="rounded-2xl bg-white border border-ink/10 p-5">
          <h3 className="font-serif text-lg tracking-tightish text-ink mb-1">
            Where people went wrong
          </h3>
          <p className="text-xs text-ink/60 mb-4">
            For each milestone, the most-common wrong first attempt — handy material for the discussion.
          </p>
          <ul className="divide-y divide-ink/5">
            {mistakes.map((m) => (
              <li key={m.item.id} className="py-3 flex items-start gap-3">
                <span
                  className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: m.item.tag_color || '#1D6E52' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink leading-snug">{m.item.text}</p>
                  <p className="mt-1 text-xs text-ink/60">
                    Correct: <span className="font-medium text-sage">{m.correct?.label}</span>
                    {' · '}
                    Most-common wrong: <span className="font-medium text-error">{m.wrong?.label}</span>
                    {' '}<span className="text-ink/40">({m.count} {m.count === 1 ? 'person' : 'people'})</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {scoreboard.length > 0 && (
        <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink/10">
            <h3 className="font-serif text-lg tracking-tightish text-ink">Scoreboard</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sand/30 text-left text-xs font-mono uppercase tracking-wider text-ink/60">
                <tr>
                  <th className="px-5 py-2.5">Name</th>
                  <th className="px-5 py-2.5 text-right">First-try score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {scoreboard.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3">
                      {row.name ? (
                        <span className="font-medium text-ink">{row.name}</span>
                      ) : (
                        <span className="italic text-ink/50">Anonymous</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {row.correctFirst}/{row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function PromptsResults({ prompts, promptResponses, participants }: Props) {
  const participantMap = new Map(participants.map((p) => [p.id, p]))

  return (
    <div className="space-y-6">
      {prompts.map((p) => {
        const responses = promptResponses.filter((r) => r.prompt_id === p.id)
        if (p.answer_type === 'word') {
          const counts = new Map<string, number>()
          for (const r of responses) {
            const w = (r.answer || '').trim().toLowerCase()
            if (w) counts.set(w, (counts.get(w) || 0) + 1)
          }
          const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
          return (
            <div key={p.id} className="rounded-2xl bg-white border border-ink/10 p-5">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
                Prompt
              </p>
              <h3 className="mt-1 font-serif text-lg tracking-tightish text-ink">{p.prompt}</h3>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                {sorted.length === 0 && <p className="text-sm text-ink/60">No answers yet.</p>}
                {sorted.map(([w, c]) => (
                  <span
                    key={w}
                    className="text-ink"
                    style={{ fontSize: `${Math.min(36, 14 + c * 4)}px` }}
                  >
                    {w} <span className="text-xs text-ink/40 align-middle">×{c}</span>
                  </span>
                ))}
              </div>
            </div>
          )
        }
        return (
          <div key={p.id} className="rounded-2xl bg-white border border-ink/10 p-5">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
              Prompt
            </p>
            <h3 className="mt-1 font-serif text-lg tracking-tightish text-ink">{p.prompt}</h3>
            <ul className="mt-4 space-y-2">
              {responses.length === 0 && <li className="text-sm text-ink/60">No answers yet.</li>}
              {responses.map((r) => {
                const part = participantMap.get(r.participant_id)
                return (
                  <li key={r.id} className="rounded-xl bg-cream/60 px-4 py-3">
                    <p className="text-xs text-ink/50">
                      {part?.display_name || <span className="italic">Anonymous</span>}
                    </p>
                    <p className="mt-1 text-sm text-ink">{r.answer}</p>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">{label}</p>
      <p className="mt-2 font-serif text-4xl tracking-tightish text-ink">{value}</p>
    </div>
  )
}
