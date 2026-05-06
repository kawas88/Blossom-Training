'use client'

import { useState } from 'react'
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
import { Sparkles, Loader2 } from 'lucide-react'
import type {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  Training,
  Participant,
  SentimentResult,
  QuestionType,
} from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'

type Props = {
  training: Training
  survey: Survey | null
  questions: SurveyQuestion[]
  surveyResponses: SurveyResponse[]
  participants: Participant[]
}

function staticOptionsFor(type: QuestionType, custom: string[] | null): string[] {
  switch (type) {
    case 'yes_no':
      return ['Yes', 'No']
    case 'yes_no_notreally':
      return ['Yes', 'No', 'Not really']
    case 'yes_no_sometimes':
      return ['Yes', 'No', 'Sometimes']
    case 'rating_5':
      return ['1', '2', '3', '4', '5']
    case 'rating_10':
      return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    case 'multiple_choice':
      return custom ?? []
    default:
      return []
  }
}

const COLORS = ['#1D6E52', '#3B82F6', '#F59E0B', '#FB7185', '#8B5CF6', '#10B981']

export function SurveyTab({ training, survey, questions, surveyResponses, participants }: Props) {
  if (!survey) {
    return (
      <div className="rounded-2xl bg-white border border-ink/10 p-8 text-center text-ink/60">
        No survey linked to this training.
      </div>
    )
  }

  const participantMap = new Map(participants.map((p) => [p.id, p]))

  return (
    <div className="space-y-5">
      {questions.map((q, idx) => {
        const responses = surveyResponses
          .filter((r) => r.question_id === q.id)
          .filter((r) => (r.answer ?? '').toString().trim().length > 0)

        return (
          <div key={q.id} className="rounded-2xl bg-white border border-ink/10 p-5 md:p-6">
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs text-ink/50 mt-1">
                {String.fromCharCode(65 + idx)}.
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-lg tracking-tightish text-ink leading-snug">
                  {q.question}
                </h3>
                <p className="mt-1 text-xs text-ink/50">
                  {responses.length} response{responses.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="mt-4">
              {responses.length === 0 ? (
                <p className="text-sm text-ink/50">No answers yet.</p>
              ) : (
                <QuestionResults
                  q={q}
                  responses={responses}
                  participantMap={participantMap}
                  trainingId={training.id}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QuestionResults({
  q,
  responses,
  participantMap,
  trainingId,
}: {
  q: SurveyQuestion
  responses: SurveyResponse[]
  participantMap: Map<string, Participant>
  trainingId: string
}) {
  if (
    q.question_type === 'short_text' ||
    q.question_type === 'long_text'
  ) {
    return (
      <TextAnswers
        q={q}
        responses={responses}
        participantMap={participantMap}
        trainingId={trainingId}
      />
    )
  }

  const opts = staticOptionsFor(q.question_type, q.options)
  const counts = new Map<string, number>()
  for (const r of responses) {
    const a = (r.answer ?? '').toString().trim()
    if (a) counts.set(a, (counts.get(a) || 0) + 1)
  }
  const total = responses.length
  const data = opts.map((o) => ({
    name: o,
    count: counts.get(o) || 0,
    pct: total === 0 ? 0 : Math.round(((counts.get(o) || 0) / total) * 100),
  }))

  return (
    <div className="space-y-3">
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
            <CartesianGrid stroke="#0F141910" strokeDasharray="2 4" />
            <XAxis dataKey="name" tick={{ fill: '#0F1419', fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#0F1419', fontSize: 11 }} />
            <Tooltip
              formatter={(v: number) => `${v} response${v === 1 ? '' : 's'}`}
              contentStyle={{
                background: '#FAF7F2',
                border: '1px solid rgba(15,20,25,0.1)',
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {data.map((d, i) => (
          <li
            key={d.name}
            className="flex items-center gap-2 rounded-xl bg-cream/60 px-3 py-2 text-xs"
          >
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="font-medium text-ink truncate">{d.name}</span>
            <span className="ml-auto text-ink/60 font-mono">
              {d.count} · {d.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TextAnswers({
  q,
  responses,
  participantMap,
  trainingId,
}: {
  q: SurveyQuestion
  responses: SurveyResponse[]
  participantMap: Map<string, Participant>
  trainingId: string
}) {
  const isLong = q.question_type === 'long_text'
  const [analysis, setAnalysis] = useState<SentimentResult | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  async function runAI() {
    if (loadingAI) return
    setLoadingAI(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/analyze-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ training_id: trainingId, question_id: q.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI analysis failed')
      setAnalysis(data.result as SentimentResult)
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoadingAI(false)
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {responses.map((r) => {
          const part = participantMap.get(r.participant_id)
          return (
            <li
              key={r.id}
              className={
                isLong
                  ? 'rounded-xl bg-cream/60 px-4 py-3'
                  : 'rounded-xl bg-cream/60 px-4 py-2 flex items-center justify-between gap-3'
              }
            >
              {isLong ? (
                <>
                  <p className="text-xs text-ink/50">
                    {part?.display_name || <span className="italic">Anonymous</span>}
                  </p>
                  <p className="mt-1 text-sm text-ink whitespace-pre-line">{r.answer}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink truncate">{r.answer}</p>
                  <p className="text-xs text-ink/50 shrink-0">
                    {part?.display_name || <span className="italic">Anonymous</span>}
                  </p>
                </>
              )}
            </li>
          )
        })}
      </ul>

      {isLong && (
        <div className="rounded-2xl bg-sand/30 border border-ink/10 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
                AI summary
              </p>
              <p className="text-sm text-ink/70 mt-1">
                Surface themes and sentiment from the answers above.
              </p>
            </div>
            <Button onClick={runAI} disabled={loadingAI || responses.length === 0}>
              {loadingAI ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {analysis ? 'Re-analyze' : 'Analyze with AI'}
                </>
              )}
            </Button>
          </div>
          {aiError && (
            <div className="mt-3 rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
              {aiError}. AI analysis unavailable, try again.
            </div>
          )}
          {analysis && <AIResult r={analysis} />}
        </div>
      )}
    </div>
  )
}

function AIResult({ r }: { r: SentimentResult }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2">
        <SentimentPill sentiment={r.sentiment} />
        <p className="text-sm text-ink/80">{r.summary}</p>
      </div>

      {r.themes.length > 0 && (
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 mb-2">
            Themes
          </p>
          <ul className="space-y-2">
            {r.themes.map((t, i) => (
              <li key={i} className="rounded-xl bg-white border border-ink/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium text-ink">{t.title}</h4>
                  <Pill variant="default">{t.frequency}</Pill>
                </div>
                <p className="mt-1 text-sm text-ink/70">{t.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.notable_quotes.length > 0 && (
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 mb-2">
            Notable quotes
          </p>
          <ul className="space-y-1.5">
            {r.notable_quotes.map((q, i) => (
              <li
                key={i}
                className="border-l-2 border-sage pl-3 italic text-sm text-ink/80"
              >
                &ldquo;{q}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.suggestions_for_trainer.length > 0 && (
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60 mb-2">
            Suggestions for the trainer
          </p>
          <ul className="space-y-1 list-disc list-inside text-sm text-ink/80">
            {r.suggestions_for_trainer.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SentimentPill({ sentiment }: { sentiment: SentimentResult['sentiment'] }) {
  if (sentiment === 'positive') return <Pill variant="success">Positive</Pill>
  if (sentiment === 'negative') return <Pill variant="error">Negative</Pill>
  return <Pill variant="default">Mixed</Pill>
}
