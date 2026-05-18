import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'
import type { QuestionType } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type IncomingQuestion = {
  position: number
  question: string
  question_type: QuestionType
  options: string[] | null
  required: boolean
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('surveys')
    .select('workspace_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(existing.workspace_id, 'trainer')
  if (!access.ok) return workspaceErrorResponse(access)
  try {
    const body = await req.json()

    const title = String(body.title || '').trim()
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

    const { error: upErr } = await supabase
      .from('surveys')
      .update({ title, description: body.description || null })
      .eq('id', params.id)
    if (upErr) throw upErr

    await supabase.from('survey_questions').delete().eq('survey_id', params.id)
    const questions = (body.questions || []) as IncomingQuestion[]
    if (questions.length > 0) {
      const rows = questions.map((q) => ({
        survey_id: params.id,
        question: q.question,
        question_type: q.question_type,
        options: q.options ?? null,
        required: !!q.required,
        position: q.position,
      }))
      const { error } = await supabase.from('survey_questions').insert(rows)
      if (error) throw error
    }
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('admin/surveys PATCH', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('surveys')
    .select('workspace_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(existing.workspace_id, 'admin')
  if (!access.ok) return workspaceErrorResponse(access)
  try {
    const { error } = await supabase.from('surveys').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('admin/surveys DELETE', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
