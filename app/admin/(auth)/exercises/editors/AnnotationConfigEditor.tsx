'use client'

import { useRef, useState } from 'react'
import { Trash2, Upload, Loader2, Circle as CircleIcon, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import type {
  AnnotationConfig,
  AnnotationRegion,
  AnnotationShape,
} from '@/lib/exercises'
import { cn } from '@/lib/utils'

type Props = {
  config: AnnotationConfig
  onChange: (next: AnnotationConfig) => void
}

type Tool = 'circle' | 'rectangle'

function uid() {
  return 'rg_' + Math.random().toString(36).slice(2, 10)
}

export function AnnotationConfigEditor({ config, onChange }: Props) {
  const [tool, setTool] = useState<Tool>('circle')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/uploads/exercise-image', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onChange({ ...config, imageUrl: data.url })
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function addRegion(region: AnnotationRegion) {
    onChange({ ...config, regions: [...config.regions, region] })
  }

  function removeRegion(id: string) {
    onChange({
      ...config,
      regions: config.regions.filter((r) => r.id !== id),
    })
  }

  function updateLabel(id: string, label: string) {
    onChange({
      ...config,
      regions: config.regions.map((r) => (r.id === id ? { ...r, label } : r)),
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-ink/10 p-6 space-y-4">
        <Textarea
          label="Prompt"
          value={config.prompt}
          onChange={(e) => onChange({ ...config, prompt: e.target.value })}
          rows={2}
          placeholder="e.g. Tap each safety hazard you can see in this classroom."
          required
          maxLength={300}
        />
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Mode
          </label>
          <div className="inline-flex rounded-full bg-cream border border-ink/15 p-1 text-xs font-medium">
            {([
              ['find_all', 'Find all'],
              ['find_one', 'Any one'],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ ...config, mode })}
                className={cn(
                  'rounded-full px-3 py-1.5 transition-colors',
                  config.mode === mode
                    ? 'bg-ink text-cream'
                    : 'text-ink/70 hover:text-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink/55">
            {config.mode === 'find_all'
              ? 'Participants must tap every region you mark.'
              : 'Any one correct tap completes the exercise.'}
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.showRegionsAfterSubmit}
            onChange={(e) =>
              onChange({ ...config, showRegionsAfterSubmit: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
          />
          <span className="text-sm">
            <span className="block font-medium text-ink">
              Reveal regions after submission
            </span>
            <span className="block text-xs text-ink/60">
              Participants see your marked regions + their own taps for context.
            </span>
          </span>
        </label>
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-6">
        <h3 className="font-serif text-lg tracking-tightish text-ink">Image</h3>
        {!config.imageUrl ? (
          <div className="mt-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-2xl border border-dashed border-ink/20 bg-cream/50 px-6 py-12 text-center hover:bg-sand/30 transition-colors"
            >
              {uploading ? (
                <Loader2 className="mx-auto h-6 w-6 text-ink/40 animate-spin" />
              ) : (
                <>
                  <Upload className="mx-auto h-6 w-6 text-ink/40" />
                  <p className="mt-2 text-sm text-ink/70">
                    Click to upload an image
                  </p>
                  <p className="mt-1 text-xs text-ink/40">
                    PNG, JPG, WebP, GIF · max 5MB
                  </p>
                </>
              )}
            </button>
            {uploadError && (
              <p className="mt-2 text-sm text-error">{uploadError}</p>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="grid md:grid-cols-[1fr_240px] gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
                    Draw a region
                  </span>
                  <div className="inline-flex rounded-full bg-cream border border-ink/15 p-1 text-xs">
                    {([
                      ['circle', CircleIcon, 'Circle'],
                      ['rectangle', Square, 'Rect'],
                    ] as const).map(([t, Icon, label]) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTool(t)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors',
                          tool === t
                            ? 'bg-ink text-cream'
                            : 'text-ink/70 hover:text-ink',
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...config, imageUrl: '', regions: [] })
                    }}
                    className="ml-auto text-xs text-ink/60 hover:text-error underline"
                  >
                    Change image
                  </button>
                </div>
                <AnnotationCanvas
                  imageUrl={config.imageUrl}
                  regions={config.regions}
                  tool={tool}
                  onAdd={(shape, coords) =>
                    addRegion({
                      id: uid(),
                      shape,
                      coords,
                      label: `Region ${config.regions.length + 1}`,
                    })
                  }
                />
                <p className="mt-2 text-xs text-ink/55">
                  Click and drag on the image to draw {tool === 'circle' ? 'a circle' : 'a rectangle'}.
                </p>
              </div>

              <div>
                <h4 className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 mb-2">
                  Regions ({config.regions.length})
                </h4>
                {config.regions.length === 0 ? (
                  <p className="text-sm text-ink/60">No regions yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {config.regions.map((r, i) => (
                      <li
                        key={r.id}
                        className="rounded-xl border border-ink/10 bg-cream/40 p-2.5"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-[10px] tracking-wider uppercase text-ink/50">
                            #{i + 1} · {r.shape}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRegion(r.id)}
                            className="p-1 text-ink/40 hover:text-error"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Input
                          value={r.label ?? ''}
                          onChange={(e) => updateLabel(r.id, e.target.value)}
                          placeholder="Label"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================================
// Canvas — image + SVG overlay. Pointer-driven drawing for circles and
// rectangles. All region coords are normalized [0, 1] relative to the
// image's rendered size, so they survive scaling.
// =====================================================================
function AnnotationCanvas({
  imageUrl,
  regions,
  tool,
  onAdd,
}: {
  imageUrl: string
  regions: AnnotationRegion[]
  tool: Tool
  onAdd: (shape: AnnotationShape, coords: number[]) => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [drag, setDrag] = useState<
    | null
    | {
        x0: number
        y0: number
        x1: number
        y1: number
      }
  >(null)

  function pointAt(e: React.PointerEvent): { x: number; y: number } | null {
    const img = imgRef.current
    if (!img) return null
    const rect = img.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    if (x < 0 || x > 1 || y < 0 || y > 1) return null
    return { x, y }
  }

  function onPointerDown(e: React.PointerEvent) {
    const p = pointAt(e)
    if (!p) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return
    const p = pointAt(e)
    if (!p) return
    setDrag({ ...drag, x1: p.x, y1: p.y })
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!drag) return
    const final = drag
    setDrag(null)
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    if (tool === 'circle') {
      const r = Math.hypot(final.x1 - final.x0, final.y1 - final.y0)
      if (r < 0.02) return // ignore accidental taps
      onAdd('circle', [final.x0, final.y0, r])
    } else {
      const x = Math.min(final.x0, final.x1)
      const y = Math.min(final.y0, final.y1)
      const w = Math.abs(final.x1 - final.x0)
      const h = Math.abs(final.y1 - final.y0)
      if (w < 0.02 || h < 0.02) return
      onAdd('rectangle', [x, y, w, h])
    }
  }

  // Live overlay for the in-progress drag
  function previewShape() {
    if (!drag) return null
    if (tool === 'circle') {
      const r = Math.hypot(drag.x1 - drag.x0, drag.y1 - drag.y0)
      return (
        <circle
          cx={drag.x0 * 100}
          cy={drag.y0 * 100}
          r={r * 100}
          fill="rgba(29,110,82,0.12)"
          stroke="#1D6E52"
          strokeWidth={0.4}
          vectorEffect="non-scaling-stroke"
        />
      )
    }
    const x = Math.min(drag.x0, drag.x1)
    const y = Math.min(drag.y0, drag.y1)
    const w = Math.abs(drag.x1 - drag.x0)
    const h = Math.abs(drag.y1 - drag.y0)
    return (
      <rect
        x={x * 100}
        y={y * 100}
        width={w * 100}
        height={h * 100}
        fill="rgba(29,110,82,0.12)"
        stroke="#1D6E52"
        strokeWidth={0.4}
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block max-w-full select-none touch-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Annotation target"
        draggable={false}
        className="block max-w-full h-auto rounded-xl"
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
      >
        {regions.map((r, idx) => (
          <RegionShape key={r.id} region={r} index={idx} />
        ))}
        {previewShape()}
      </svg>
    </div>
  )
}

function RegionShape({ region, index }: { region: AnnotationRegion; index: number }) {
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
          strokeWidth={0.4}
          vectorEffect="non-scaling-stroke"
        />
      </g>
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
        fill={`${tint}25`}
        stroke={tint}
        strokeWidth={0.4}
        vectorEffect="non-scaling-stroke"
      />
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
        strokeWidth={0.4}
        vectorEffect="non-scaling-stroke"
      />
    )
  }
  return null
}
