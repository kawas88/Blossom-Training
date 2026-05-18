import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'
import { analyzeSentiment } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const trainingId = String(body.training_id || '').trim()
    const questionId = String(body.question_id || '').trim()
    if (!trainingId || !questionId) {
      return NextResponse.json({ error: 'Missing training_id or question_id' }, { status: 400 })
    }
    const supabase = createAdminClient()
    const { data: trainingMeta } = await supabase
      .from('trainings')
      .select('workspace_id')
      .eq('id', trainingId)
      .maybeSingle()
    if (!trainingMeta) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const access = await requireWorkspaceAccess(trainingMeta.workspace_id, 'viewer')
    if (!access.ok) return workspaceErrorResponse(access)

    const [{ data: question }, { data: responses }] = await Promise.all([
      supabase.from('survey_questions').select('id, question').eq('id', questionId).maybeSingle(),
      supabase
        .from('survey_responses')
        .select('id, answer, created_at')
        .eq('training_id', trainingId)
        .eq('question_id', questionId)
        .order('created_at', { ascending: true }),
    ])

    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const filtered = (responses || [])
      .filter((r) => (r.answer ?? '').toString().trim().length > 0)
    if (filtered.length === 0) {
      return NextResponse.json({ error: 'No answers to analyze yet.' }, { status: 400 })
    }

    // Cache check
    const latest = filtered[filtered.length - 1]?.created_at as string | undefined
    const { data: cached } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('training_id', trainingId)
      .eq('question_id', questionId)
      .eq('analysis_type', 'sentiment')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached && latest && new Date(cached.created_at) >= new Date(latest)) {
      return NextResponse.json({ result: cached.result, cached: true })
    }

    let result
    try {
      result = await analyzeSentiment(
        question.question,
        filtered.map((r) => (r.answer ?? '').toString()),
      )
    } catch (err) {
      console.error('AI analyze error', err)
      return NextResponse.json(
        { error: 'AI analysis unavailable, try again' },
        { status: 502 },
      )
    }

    await supabase.from('ai_analyses').insert({
      training_id: trainingId,
      question_id: questionId,
      analysis_type: 'sentiment',
      result,
    })

    return NextResponse.json({ result, cached: false })
  } catch (e: unknown) {
    console.error('analyze-responses error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
