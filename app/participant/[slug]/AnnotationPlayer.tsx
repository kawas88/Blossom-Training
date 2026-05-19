'use client'

import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type {
  AnnotationConfig,
  AnnotationRegion,
  Exercise,
} from '@/lib/exercises'
import type { Training, Participant } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  training: Training
  participant: Participant
  exercise: Exercise & { config: AnnotationConfig }
  onComplete: () => void
}

type Tap = { x: number; y: number; hitRegionId: string | null }

export function AnnotationPlayer({
  training,
  participant,
  exercise,
  onComplete,
}: Props) {
  const config = exercise.config
  const imgRef = useRef<HTMLImageElement>(null)
  const [taps, setTaps] = useState<Tap[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentHit, setRecentHit] = useState<string | null>(null)

  const uniqueHits = useMemo(() => {
    const s = new Set<string>()
    for (const t of taps) if (t.hitRegionId) s.add(t.hitRegionId)
    return s
  }, [taps])

  const targetCount = config.regions.length
  const findOne = config.mode === 'find_one'
  const canSubmit =
    uniqueHits.size > 0 && (findOne || uniqueHits.size === targetCount)

  function handleClick(e: React.PointerEvent<HTMLDivElement>) {
    if (saved) return
    const img = imgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    const hit = detectHit(config.regions, x, y)
    setTaps((prev) => [...prev, { x, y, hitRegionId: hit }])
    if (hit) {
      setRecentHit(hit)
      window.setTimeout(() => setRecentHit(null), 700)
      if (findOne) {
        // Auto-trigger submit on first hit in find_one mode.
        window.setTimeout(() => submit(), 350)
      }
    }
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
          response: { taps },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || 'Could not save your taps.')
      }
      setSubmitting(false)
      setSaved(true)
      if (config.showRegionsAfterSubmit) {
        setReveal(true)
        window.setTimeout(() => onComplete(), 3500)
      } else {
        window.setTimeout(() => onComplete(), 1500)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (!config.imageUrl) {
    return (
      <div className="px-4 md:px-6 py-16 text-center">
        <p className="text-ink/70">This annotation exercise has no image yet.</p>
        <Button onClick={onComplete} className="mt-6" variant="secondary">
          Back to activities
        </Button>
      </div>
    )
  }

  if (saved && !reveal) {
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
            Nice spotting — your answers are <span className="italic-sage">in.</span>
          </h2>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="px-3 md:px-6 py-6 md:py-8 pb-24">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Annotation
        </p>
        <h1 className="mt-1 font-serif text-2xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
          {exercise.title}
        </h1>
        {config.prompt && (
          <p className="mt-2 text-ink/70 text-balance">{config.prompt}</p>
        )}

        {!findOne && targetCount > 0 && !reveal && (
          <p className="mt-3 font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
            {uniqueHits.size} of {targetCount} found
          </p>
        )}

        <div className="mt-5 mx-auto inline-block max-w-full">
          <div
            className="relative inline-block max-w-full select-none touch-none"
            onPointerDown={handleClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={config.imageUrl}
              alt={exercise.title}
              draggable={false}
              className="block max-w-full h-auto rounded-2xl border border-ink/10 cursor-crosshair"
              style={{ maxHeight: '80vh' }}
            />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              {reveal &&
                config.regions.map((r, idx) => (
                  <RevealRegion key={r.id} region={r} index={idx} />
                ))}
              {/* Tap markers */}
              {taps.map((t, i) => (
                <g key={i}>
                  <circle
                    cx={t.x * 100}
                    cy={t.y * 100}
                    r={1.6}
                    fill={t.hitRegionId ? '#1D6E52' : '#A1A1A1'}
                    opacity={0.85}
                  />
                  {t.hitRegionId === recentHit && (
                    <circle
                      cx={t.x * 100}
                      cy={t.y * 100}
                      r={4}
                      fill="none"
                      stroke="#1D6E52"
                      strokeWidth={0.4}
                      vectorEffect="non-scaling-stroke"
                      opacity={0.7}
                    >
                      <animate
                        attributeName="r"
                        from={1.6}
                        to={6}
                        dur="0.6s"
                        fill="freeze"
                      />
                      <animate
                        attributeName="opacity"
                        from={0.7}
                        to={0}
                        dur="0.6s"
                        fill="freeze"
                      />
                    </circle>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {!findOne && (
          <div className="mt-5">
            <Button size="lg" onClick={submit} disabled={!canSubmit || submitting}>
              {submitting
                ? 'Saving…'
                : uniqueHits.size === targetCount
                ? "Done — that's all of them →"
                : `Submit (${uniqueHits.size} of ${targetCount}) →`}
            </Button>
          </div>
        )}

        {findOne && taps.length > 0 && uniqueHits.size === 0 && (
          <p className="mt-3 text-xs text-ink/55 text-center">
            Not quite — keep looking.
          </p>
        )}
      </div>
    </div>
  )
}

function RevealRegion({ region, index }: { region: AnnotationRegion; index: number }) {
  const tint = ['#1D6E52', '#C9624A', '#3B82F6', '#F59E0B', '#8B5CF6', '#FB7185'][
    index % 6
  ]
  if (region.shape === 'circle' && region.coords.length >= 3) {
    const [cx, cy, r] = region.coords
    return (
      <g>
        <circle
          cx={cx * 100}
          cy={cy * 100}
          r={r * 100}
          fill={`${tint}25`}
          stroke={tint}
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
        {region.label && (
          <text
            x={cx * 100}
            y={(cy - r) * 100 - 1}
            textAnchor="middle"
            fill={tint}
            fontSize={2.6}
            fontWeight={500}
            style={{ paintOrder: 'stroke' }}
            stroke="#FAF7F2"
            strokeWidth={0.6}
          >
            {region.label}
          </text>
        )}
      </g>
    )
  }
  if (region.shape === 'rectangle' && region.coords.length >= 4) {
    const [x, y, w, h] = region.coords
    return (
      <g>
        <rect
          x={x * 100}
          y={y * 100}
          width={w * 100}
          height={h * 100}
          fill={`${tint}25`}
          stroke={tint}
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
        {region.label && (
          <text
            x={(x + w / 2) * 100}
            y={y * 100 - 1}
            textAnchor="middle"
            fill={tint}
            fontSize={2.6}
            fontWeight={500}
            stroke="#FAF7F2"
            strokeWidth={0.6}
            style={{ paintOrder: 'stroke' }}
          >
            {region.label}
          </text>
        )}
      </g>
    )
  }
  if (region.shape === 'polygon' && region.coords.length >= 6) {
    const points: string[] = []
    for (let i = 0; i < region.coords.length; i += 2) {
      points.push(`${region.coords[i] * 100},${region.coords[i + 1] * 100}`)
    }
    return (
      <polygon
        points={points.join(' ')}
        fill={`${tint}25`}
        stroke={tint}
        strokeWidth={0.5}
        vectorEffect="non-scaling-stroke"
      />
    )
  }
  return null
}

// Client-side mirror of server hit detection so the UI can give instant
// feedback. Server re-checks on submit so this can't be cheated.
function detectHit(
  regions: AnnotationRegion[],
  x: number,
  y: number,
): string | null {
  for (const r of regions) {
    const c = r.coords
    if (r.shape === 'circle' && c.length >= 3) {
      if (Math.hypot(x - c[0], y - c[1]) <= c[2]) return r.id
    } else if (r.shape === 'rectangle' && c.length >= 4) {
      if (x >= c[0] && x <= c[0] + c[2] && y >= c[1] && y <= c[1] + c[3]) {
        return r.id
      }
    } else if (r.shape === 'polygon' && c.length >= 6) {
      if (pointInPolygon(x, y, c)) return r.id
    }
  }
  return null
}

function pointInPolygon(x: number, y: number, coords: number[]): boolean {
  let inside = false
  const n = Math.floor(coords.length / 2)
  let j = n - 1
  for (let i = 0; i < n; i++) {
    const xi = coords[i * 2]
    const yi = coords[i * 2 + 1]
    const xj = coords[j * 2]
    const yj = coords[j * 2 + 1]
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
    j = i
  }
  return inside
}
