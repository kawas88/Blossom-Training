'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, EyeOff, Eye } from 'lucide-react'
import type {
  ExerciseResponse,
  ReflectionConfig,
  ReflectionResponseShape,
  TrainingExerciseWithDef,
} from '@/lib/exercises'
import type { Participant } from '@/lib/types'
import { Pill } from '@/components/ui/Pill'
import { cn } from '@/lib/utils'

type Props = {
  exercise: TrainingExerciseWithDef
  responses: ExerciseResponse[]
  participants: Participant[]
}

type Sentiment = 'positive' | 'mixed' | 'negative'
type Frequency = 'common' | 'some' | 'few'

const FREQ_WEIGHT: Record<Frequency, number> = { common: 3, some: 2, few: 1 }

const SENTIMENT_TONE: Record<
  Sentiment,
  { bg: string; text: string; label: string }
> = {
  positive: { bg: 'bg-sage/15', text: 'text-sage', label: 'Positive' },
  mixed: { bg: 'bg-sand', text: 'text-ink', label: 'Mixed' },
  negative: { bg: 'bg-terracotta/15', text: 'text-terracotta', label: 'Negative' },
}

export function ReflectionResults({ exercise, responses, participants }: Props) {
  const config = exercise.config as ReflectionConfig
  const [anonymize, setAnonymize] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  )

  // Stable ordering for "Participant N" labels.
  const orderedResponses = useMemo(
    () =>
      [...responses].sort((a, b) => {
        const ta = a.completed_at ? new Date(a.completed_at).getTime() : 0
        const tb = b.completed_at ? new Date(b.completed_at).getTime() : 0
        return ta - tb
      }),
    [responses],
  )

  function displayName(participantId: string, idx: number): string {
    if (anonymize) return `Participant ${idx + 1}`
    const p = participantMap.get(participantId)
    return p?.display_name?.trim() || 'Anonymous'
  }

  // Sentiment distribution
  const sentimentCounts: Record<Sentiment, number> = { positive: 0, mixed: 0, negative: 0 }
  for (const r of responses) {
    const a = (r.response as ReflectionResponseShape | undefined)?.aiAnalysis
    if (a && (a.sentiment === 'positive' || a.sentiment === 'mixed' || a.sentiment === 'negative')) {
      sentimentCounts[a.sentiment] += 1
    }
  }
  const analyzedTotal =
    sentimentCounts.positive + sentimentCounts.mixed + sentimentCounts.negative

  // Aggregate themes across all responses. Dedupe by lowercase title; sum
  // frequency weights so the most common themes float to the top.
  type ThemeAgg = {
    title: string
    description: string
    weight: number
    occurrences: number
  }
  const aggregatedThemes: ThemeAgg[] = useMemo(() => {
    const byKey = new Map<string, ThemeAgg>()
    for (const r of responses) {
      const a = (r.response as ReflectionResponseShape | undefined)?.aiAnalysis
      if (!a?.themes) continue
      for (const t of a.themes) {
        if (!t?.title) continue
        const key = t.title.toLowerCase().trim()
        const existing = byKey.get(key)
        const freqWeight = FREQ_WEIGHT[t.frequency as Frequency] ?? 1
        if (existing) {
          existing.weight += freqWeight
          existing.occurrences += 1
        } else {
          byKey.set(key, {
            title: t.title,
            description: t.description,
            weight: freqWeight,
            occurrences: 1,
          })
        }
      }
    }
    return Array.from(byKey.values()).sort((a, b) => b.weight - a.weight)
  }, [responses])

  return (
    <div className="space-y-6">
      {/* Header + anonymize toggle */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
            Reflection
          </p>
          <p className="mt-1 text-sm text-ink/70 max-w-xl">
            <span className="italic text-ink">&ldquo;{config.prompt}&rdquo;</span>
          </p>
        </div>
        <button
          onClick={() => setAnonymize((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            anonymize
              ? 'bg-ink text-cream border-ink'
              : 'bg-white text-ink border-ink/15 hover:border-ink/30',
          )}
          title="Hide participant names"
        >
          {anonymize ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          Anonymize names
        </button>
      </div>

      {/* Summary + sentiment */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white border border-ink/10 p-5">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
            Responses
          </p>
          <p className="mt-2 font-serif text-3xl tracking-tightish text-ink">
            {responses.length}
          </p>
        </div>
        <SentimentBar
          label="Positive"
          tone={SENTIMENT_TONE.positive}
          count={sentimentCounts.positive}
          total={analyzedTotal}
        />
        <SentimentBar
          label="Mixed"
          tone={SENTIMENT_TONE.mixed}
          count={sentimentCounts.mixed}
          total={analyzedTotal}
        />
        <SentimentBar
          label="Negative"
          tone={SENTIMENT_TONE.negative}
          count={sentimentCounts.negative}
          total={analyzedTotal}
        />
      </div>

      {/* Aggregated themes */}
      {aggregatedThemes.length > 0 && (
        <div className="rounded-2xl bg-white border border-ink/10 p-6">
          <h3 className="font-serif text-2xl tracking-tightish text-ink mb-1">
            What people <span className="italic-sage">are saying.</span>
          </h3>
          <p className="text-sm text-ink/60">
            Themes pulled from {responses.length} response
            {responses.length === 1 ? '' : 's'} by AI, ranked by how often they appear.
          </p>
          <ul className="mt-5 grid sm:grid-cols-2 gap-3">
            {aggregatedThemes.map((t) => (
              <li
                key={t.title}
                className="rounded-xl bg-cream/60 border border-ink/10 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-serif text-lg tracking-tightish text-ink leading-snug">
                    <span className="italic-sage">{t.title}</span>
                  </h4>
                  <Pill variant="default" className="text-[10px] shrink-0">
                    {t.occurrences === 1 ? '1 mention' : `${t.occurrences} mentions`}
                  </Pill>
                </div>
                <p className="mt-1 text-sm text-ink/70">{t.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analyzedTotal === 0 && responses.length > 0 && (
        <div className="rounded-2xl bg-sand/40 border border-ink/10 p-4 text-sm text-ink/70">
          AI analysis isn&rsquo;t available for these responses yet — either it&rsquo;s
          disabled on this exercise, or the analyzer hasn&rsquo;t run successfully.
        </div>
      )}

      {/* Per-response cards */}
      <div className="space-y-2">
        <h3 className="font-serif text-xl tracking-tightish text-ink">
          Individual <span className="italic-sage">responses.</span>
        </h3>
        <ul className="space-y-2">
          {orderedResponses.map((r, idx) => {
            const payload = r.response as ReflectionResponseShape | undefined
            const text = payload?.text || ''
            const a = payload?.aiAnalysis
            const preview = text.length > 120 ? text.slice(0, 120).trimEnd() + '…' : text
            const isOpen = expandedId === r.id
            const sentiment = a?.sentiment as Sentiment | undefined
            const tone = sentiment ? SENTIMENT_TONE[sentiment] : null
            return (
              <li
                key={r.id}
                className="rounded-2xl bg-white border border-ink/10 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isOpen ? null : r.id)}
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-sand/30 transition-colors"
                  aria-expanded={isOpen}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink text-sm">
                        {displayName(r.participant_id, idx)}
                      </span>
                      {tone && (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                            tone.bg,
                            tone.text,
                          )}
                        >
                          {tone.label}
                        </span>
                      )}
                    </div>
                    {!isOpen && (
                      <p className="mt-1 text-sm text-ink/70 line-clamp-1">
                        {preview || <span className="italic text-ink/40">No text</span>}
                      </p>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 mt-0.5 text-ink/40 transition-transform',
                      isOpen && 'rotate-180 text-ink',
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-5 pt-1 space-y-4">
                    <p className="text-sm text-ink whitespace-pre-line leading-relaxed">
                      {text || <span className="italic text-ink/40">No text submitted.</span>}
                    </p>
                    {a?.summary && (
                      <div className="rounded-xl bg-sand/40 border border-ink/10 p-3">
                        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 mb-1">
                          AI summary
                        </p>
                        <p className="text-sm text-ink/80">{a.summary}</p>
                      </div>
                    )}
                    {a?.themes && a.themes.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 mb-2">
                          Themes in this response
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {a.themes.map((t, ti) => (
                            <li
                              key={`${r.id}-${ti}`}
                              className="rounded-full bg-sage/10 text-sage px-2.5 py-0.5 text-[11px]"
                              title={t.description}
                            >
                              {t.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function SentimentBar({
  label,
  tone,
  count,
  total,
}: {
  label: string
  tone: { bg: string; text: string; label: string }
  count: number
  total: number
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={cn('font-serif text-3xl tracking-tightish', tone.text)}>
          {count}
        </span>
        <span className="text-sm text-ink/50">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-ink/5 overflow-hidden">
        <div
          className={cn('h-full rounded-full', tone.bg.replace('/15', ''))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
