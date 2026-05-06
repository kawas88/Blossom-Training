import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateTime } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const supabase = createAdminClient()
    const [
      { data: training },
      { data: participants },
      { data: matching },
      { data: prompts },
      { data: surveyResp },
      { data: items },
      { data: cats },
      { data: questions },
      { data: promptDefs },
    ] = await Promise.all([
      supabase.from('trainings').select('*').eq('id', params.id).maybeSingle(),
      supabase.from('participants').select('*').eq('training_id', params.id),
      supabase.from('icebreaker_matching_responses').select('*').eq('training_id', params.id),
      supabase.from('icebreaker_prompt_responses').select('*').eq('training_id', params.id),
      supabase.from('survey_responses').select('*').eq('training_id', params.id),
      supabase.from('icebreaker_items').select('id, text, correct_category_id'),
      supabase.from('icebreaker_categories').select('id, label'),
      supabase.from('survey_questions').select('id, question, position').order('position'),
      supabase.from('icebreaker_prompts').select('id, prompt'),
    ])

    if (!training) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const itemMap = new Map((items || []).map((i: { id: string; text: string }) => [i.id, i]))
    const catMap = new Map((cats || []).map((c: { id: string; label: string }) => [c.id, c]))
    const qMap = new Map((questions || []).map((q: { id: string; question: string }) => [q.id, q]))
    const promptMap = new Map((promptDefs || []).map((p: { id: string; prompt: string }) => [p.id, p]))

    const lines: string[] = []
    lines.push(['type', 'participant', 'joined_at', 'detail', 'value', 'correct', 'attempts'].map(csvEscape).join(','))

    const partMap = new Map((participants || []).map((p) => [p.id, p]))

    for (const r of matching || []) {
      const p = partMap.get(r.participant_id)
      const item = itemMap.get(r.item_id) as { text: string; correct_category_id: string | null } | undefined
      const correctLabel = item?.correct_category_id
        ? (catMap.get(item.correct_category_id) as { label: string } | undefined)?.label
        : ''
      const firstAttemptLabel = r.first_attempt_category_id
        ? (catMap.get(r.first_attempt_category_id) as { label: string } | undefined)?.label
        : ''
      lines.push(
        [
          'icebreaker_matching',
          p?.display_name || 'Anonymous',
          formatDateTime(p?.joined_at),
          item?.text || '',
          `first_attempt=${firstAttemptLabel || '—'} | correct=${correctLabel || '—'}`,
          r.was_correct ? 'yes' : 'no',
          r.attempts,
        ]
          .map(csvEscape)
          .join(','),
      )
    }

    for (const r of prompts || []) {
      const p = partMap.get(r.participant_id)
      const def = promptMap.get(r.prompt_id) as { prompt: string } | undefined
      lines.push(
        [
          'icebreaker_prompt',
          p?.display_name || 'Anonymous',
          formatDateTime(p?.joined_at),
          def?.prompt || '',
          r.answer || '',
          '',
          '',
        ]
          .map(csvEscape)
          .join(','),
      )
    }

    for (const r of surveyResp || []) {
      const p = partMap.get(r.participant_id)
      const q = qMap.get(r.question_id) as { question: string } | undefined
      lines.push(
        [
          'survey',
          p?.display_name || 'Anonymous',
          formatDateTime(p?.joined_at),
          q?.question || '',
          r.answer || '',
          '',
          '',
        ]
          .map(csvEscape)
          .join(','),
      )
    }

    const csv = lines.join('\n')
    const filename = `${training.slug || 'training'}-export.csv`
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: unknown) {
    console.error('csv export error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
