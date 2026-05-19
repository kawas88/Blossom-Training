'use client'

import { useMemo } from 'react'
import type {
  AnnotationConfig,
  AnnotationRegion,
  AnnotationResponseShape,
  ExerciseResponse,
  TrainingExerciseWithDef,
} from '@/lib/exercises'
import type { Participant } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  exercise: TrainingExerciseWithDef
  responses: ExerciseResponse[]
  participants: Participant[]
}

export function AnnotationResults({
  exercise,
  responses,
  participants,
}: Props) {
  const config = exercise.config as AnnotationConfig
  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  )

  // % hit per region
  const regionStats = useMemo(() => {
    return config.regions.map((r) => {
      const hits = responses.filter((resp) => {
        const taps =
          (resp.response as AnnotationResponseShape | undefined)?.taps ?? []
        return taps.some((t) => t.hitRegionId === r.id)
      }).length
      return { region: r, hits }
    })
  }, [config.regions, responses])

  const allTaps = useMemo(() => {
    const out: { x: number; y: number; hit: boolean }[] = []
    for (const r of responses) {
      const taps = (r.response as AnnotationResponseShape | undefined)?.taps ?? []
      for (const t of taps) {
        out.push({ x: t.x, y: t.y, hit: !!t.hitRegionId })
      }
    }
    return out
  }, [responses])

  const avgScore =
    responses.length === 0
      ? 0
      : responses.reduce((s, r) => s + (r.score ?? 0), 0) / responses.length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Responses" value={String(responses.length)} />
        <Stat label="Regions" value={String(config.regions.length)} />
        <Stat
          label={config.mode === 'find_one' ? 'Hit rate' : 'Avg score'}
          value={`${Math.round(avgScore * 100)}%`}
        />
      </div>

      {config.imageUrl && (
        <div className="rounded-2xl bg-white border border-ink/10 p-5">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
            Prompt
          </p>
          <p className="mt-1 italic text-ink/80 text-balance">
            &ldquo;{config.prompt}&rdquo;
          </p>
          <div className="mt-4 mx-auto inline-block max-w-full relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.imageUrl}
              alt={exercise.title}
              className="block max-w-full h-auto rounded-xl border border-ink/10"
            />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              {config.regions.map((r, idx) => (
                <RegionShape key={r.id} region={r} index={idx} />
              ))}
              {allTaps.map((t, i) => (
                <circle
                  key={i}
                  cx={t.x * 100}
                  cy={t.y * 100}
                  r={1.2}
                  fill={t.hit ? '#1D6E52' : '#A1A1A1'}
                  opacity={0.6}
                />
              ))}
            </svg>
          </div>
        </div>
      )}

      {regionStats.length > 0 && (
        <div className="rounded-2xl bg-white border border-ink/10 p-5">
          <h3 className="font-serif text-lg tracking-tightish text-ink mb-3">
            Region hit rate
          </h3>
          <ul className="space-y-2">
            {regionStats.map((row, i) => {
              const pct =
                responses.length === 0
                  ? 0
                  : Math.round((row.hits / responses.length) * 100)
              const tint = [
                '#1D6E52',
                '#C9624A',
                '#3B82F6',
                '#F59E0B',
                '#8B5CF6',
                '#FB7185',
              ][i % 6]
              return (
                <li
                  key={row.region.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tint }}
                  />
                  <span className="flex-1 truncate text-ink">
                    {row.region.label ?? `Region ${i + 1}`}
                  </span>
                  <div className="flex-1 max-w-[180px] h-1.5 rounded-full bg-ink/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: tint,
                      }}
                    />
                  </div>
                  <span className="font-mono text-xs text-ink/60 w-20 text-right shrink-0">
                    {row.hits} · {pct}%
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
            Individual responses
          </h3>
        </div>
        <ul className="divide-y divide-ink/5">
          {responses.map((r) => {
            const part = participantMap.get(r.participant_id)
            const taps =
              (r.response as AnnotationResponseShape | undefined)?.taps ?? []
            const hits = taps.filter((t) => t.hitRegionId).length
            return (
              <li
                key={r.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <span className="font-medium text-ink">
                  {part?.display_name?.trim() || (
                    <span className="italic text-ink/50">Anonymous</span>
                  )}
                </span>
                <span className="font-mono text-xs text-ink/60">
                  {hits} hit{hits === 1 ? '' : 's'} · {taps.length} tap{taps.length === 1 ? '' : 's'}
                  {' · '}
                  {Math.round((r.score ?? 0) * 100)}%
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function RegionShape({
  region,
  index,
}: {
  region: AnnotationRegion
  index: number
}) {
  const tint = ['#1D6E52', '#C9624A', '#3B82F6', '#F59E0B', '#8B5CF6', '#FB7185'][
    index % 6
  ]
  if (region.shape === 'circle' && region.coords.length >= 3) {
    const [cx, cy, r] = region.coords
    return (
      <circle
        cx={cx * 100}
        cy={cy * 100}
        r={r * 100}
        fill={`${tint}1A`}
        stroke={tint}
        strokeWidth={0.4}
        vectorEffect="non-scaling-stroke"
      />
    )
  }
  if (region.shape === 'rectangle' && region.coords.length >= 4) {
    const [x, y, w, h] = region.coords
    return (
      <rect
        x={x * 100}
        y={y * 100}
        width={w * 100}
        height={h * 100}
        fill={`${tint}1A`}
        stroke={tint}
        strokeWidth={0.4}
        vectorEffect="non-scaling-stroke"
      />
    )
  }
  return null
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
