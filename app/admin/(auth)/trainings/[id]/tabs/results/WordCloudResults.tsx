'use client'

import { useMemo } from 'react'
import type {
  ExerciseResponse,
  TrainingExerciseWithDef,
  WordCloudConfig,
  WordCloudResponseShape,
} from '@/lib/exercises'
import type { Participant } from '@/lib/types'
import { WordCloud, aggregateWords } from '@/components/WordCloud'

type Props = {
  exercise: TrainingExerciseWithDef
  responses: ExerciseResponse[]
  participants: Participant[]
}

export function WordCloudResults({ exercise, responses, participants }: Props) {
  const config = exercise.config as WordCloudConfig

  const allWords = useMemo(() => {
    const out: string[] = []
    for (const r of responses) {
      const ws = (r.response as WordCloudResponseShape | undefined)?.words ?? []
      for (const w of ws) {
        if (typeof w === 'string' && w.trim()) out.push(w.trim())
      }
    }
    return out
  }, [responses])

  const aggregated = useMemo(() => aggregateWords(allWords), [allWords])

  const totalSubmissions = responses.length
  const uniqueWords = aggregated.length
  const totalWords = allWords.length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Participants" value={String(totalSubmissions)} />
        <Stat
          label="Total words"
          value={String(totalWords)}
          sub={totalWords === 1 ? 'submission' : 'submissions'}
        />
        <Stat label="Unique words" value={String(uniqueWords)} />
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-6 md:p-8">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Prompt
        </p>
        <p className="mt-1 italic text-ink/80 text-balance">
          &ldquo;{config.prompt}&rdquo;
        </p>
        <div className="mt-6 min-h-[200px] flex items-center justify-center">
          <WordCloud
            words={aggregated}
            className="max-w-3xl mx-auto py-4"
            minSize={16}
            maxSize={64}
          />
        </div>
      </div>

      {aggregated.length > 0 && (
        <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink/10">
            <h3 className="font-serif text-lg tracking-tightish text-ink">
              Top words
            </h3>
          </div>
          <ul className="divide-y divide-ink/5">
            {aggregated.slice(0, 20).map((w) => {
              const pct =
                totalWords === 0 ? 0 : Math.round((w.count / totalWords) * 100)
              return (
                <li
                  key={w.text}
                  className="px-5 py-3 flex items-center gap-3"
                >
                  <span className="font-medium text-ink flex-1">{w.text}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-ink/5 overflow-hidden max-w-xs">
                    <div
                      className="h-full bg-sage rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-ink/60 w-16 text-right shrink-0">
                    {w.count} · {pct}%
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
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
        <span className="font-serif text-3xl tracking-tightish text-ink">{value}</span>
        {sub && <span className="text-sm text-ink/50">{sub}</span>}
      </div>
    </div>
  )
}
