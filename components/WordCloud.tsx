'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  words: { text: string; count: number }[]
  className?: string
  /** Smallest rendered size in px. Default 14. */
  minSize?: number
  /** Largest rendered size in px. Default 56. */
  maxSize?: number
}

// ---------------------------------------------------------------------
// A lightweight word cloud. No external library — flex-wrap layout with
// font-size scaled by frequency. Editorial palette (sage / terracotta /
// ink), each word gets a deterministic tint and rotation so the visual
// is varied but stable across re-renders.
// ---------------------------------------------------------------------
export function WordCloud({
  words,
  className,
  minSize = 14,
  maxSize = 56,
}: Props) {
  const rendered = useMemo(() => {
    if (words.length === 0) return []
    const counts = words.map((w) => w.count)
    const min = Math.min(...counts)
    const max = Math.max(...counts)
    const range = max - min || 1
    // Highest frequency first so it lands near the top of the flex flow.
    const ordered = [...words].sort((a, b) => b.count - a.count)
    return ordered.map((w, idx) => {
      const norm = (w.count - min) / range
      const size = Math.round(minSize + norm * (maxSize - minSize))
      const palette = ['text-ink', 'text-sage', 'text-terracotta', 'text-ink/70']
      const tint = palette[hashCode(w.text) % palette.length]
      const rotation =
        ((hashCode(w.text + ':r') % 7) - 3) * 1.5 // -4.5° … +4.5°
      return { ...w, size, tint, rotation, key: `${w.text}:${idx}` }
    })
  }, [words, minSize, maxSize])

  return (
    <div
      className={cn(
        'flex flex-wrap items-baseline justify-center gap-x-3 gap-y-2',
        'font-serif tracking-tightish leading-none',
        className,
      )}
      aria-label="Word cloud"
    >
      {rendered.length === 0 ? (
        <p className="text-sm text-ink/40 italic">No words yet.</p>
      ) : (
        rendered.map((w) => (
          <span
            key={w.key}
            className={cn('whitespace-nowrap select-none', w.tint)}
            style={{
              fontSize: w.size,
              transform: `rotate(${w.rotation}deg)`,
            }}
            title={`${w.text} — ${w.count} mention${w.count === 1 ? '' : 's'}`}
          >
            {w.text}
          </span>
        ))
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// Build a frequency-aggregated list from a flat array of words. Stable
// ordering for ties so the cloud doesn't shuffle on every render.
// ---------------------------------------------------------------------
export function aggregateWords(allWords: string[]): { text: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const w of allWords) {
    const k = w.trim()
    if (!k) continue
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([text, count]) => ({ text, count }))
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}
