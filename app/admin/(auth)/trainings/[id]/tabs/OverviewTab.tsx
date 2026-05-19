'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type {
  Training,
  Participant,
  IcebreakerMatchingResponse,
  IcebreakerPromptResponse,
  Icebreaker,
  Survey,
  SurveyQuestion,
  SurveyResponse,
} from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { JoinShareCard } from '../JoinShareCard'

type Props = {
  training: Training
  participants: Participant[]
  icebreaker: Icebreaker | null
  survey: Survey | null
  questions: SurveyQuestion[]
  matchingResponses: IcebreakerMatchingResponse[]
  promptResponses: IcebreakerPromptResponse[]
  surveyResponses: SurveyResponse[]
}

export function OverviewTab({
  training,
  participants,
  icebreaker,
  survey,
  questions,
  matchingResponses,
  promptResponses,
  surveyResponses,
}: Props) {
  // The join URL needs window.location.origin in the browser. Render a
  // placeholder during hydration so the QR doesn't double-paint.
  const [origin, setOrigin] = useState<string>('')
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  const joinUrl = origin ? `${origin}/?code=${training.join_code}` : ''
  const total = participants.length
  const iceDone = participants.filter((p) => !!p.icebreaker_completed_at).length
  const surveyDone = participants.filter((p) => !!p.survey_completed_at).length

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))

  function iceFor(participantId: string): boolean {
    if (!icebreaker) return false
    if (icebreaker.format === 'matching') {
      return matchingResponses.some((r) => r.participant_id === participantId)
    }
    return promptResponses.some((r) => r.participant_id === participantId)
  }

  function surveyFor(participantId: string): boolean {
    if (!survey) return false
    return surveyResponses.some((r) => r.participant_id === participantId)
  }

  return (
    <div className="space-y-6">
      {joinUrl && (
        <JoinShareCard
          joinCode={training.join_code}
          joinUrl={joinUrl}
          slug={training.slug}
          status={training.status as 'draft' | 'live' | 'closed'}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Stat label="Joined" value={total} sub="participants" />
        <Stat
          label="Icebreaker done"
          value={iceDone}
          sub={`${pct(iceDone)}%`}
        />
        <Stat
          label="Survey done"
          value={surveyDone}
          sub={`${pct(surveyDone)}%`}
        />
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink/10 flex items-center justify-between">
          <h3 className="font-serif text-lg tracking-tightish text-ink">Participants</h3>
          <span className="text-xs text-ink/50">Live updates on</span>
        </div>
        {participants.length === 0 ? (
          <div className="px-5 py-12 text-center text-ink/60">
            No one has joined yet — share your join code to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sand/30 text-left text-xs font-mono uppercase tracking-wider text-ink/60">
                <tr>
                  <th className="px-5 py-2.5">Name</th>
                  <th className="px-5 py-2.5">Joined</th>
                  <th className="px-5 py-2.5 text-center">Icebreaker</th>
                  <th className="px-5 py-2.5 text-center">Survey</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {participants.map((p) => (
                  <tr key={p.id} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-3">
                      {p.display_name ? (
                        <span className="font-medium text-ink">{p.display_name}</span>
                      ) : (
                        <span className="italic text-ink/50">Anonymous</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink/60">{formatDateTime(p.joined_at)}</td>
                    <td className="px-5 py-3 text-center">
                      {iceFor(p.id) ? (
                        <Check className="h-4 w-4 text-success inline" />
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {surveyFor(p.id) ? (
                        <Check className="h-4 w-4 text-success inline" />
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-serif text-4xl tracking-tightish text-ink">{value}</span>
        <span className="text-sm text-ink/50">{sub}</span>
      </div>
    </div>
  )
}
