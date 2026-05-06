import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
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

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const title = String(body.title || '').trim()
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

    const { data: survey, error } = await supabase
      .from('surveys')
      .insert({ title, description: body.description || null })
      .select('*')
      .single()
    if (error) throw error

    const questions = (body.questions || []) as IncomingQuestion[]
    if (questions.length > 0) {
      const rows = questions.map((q) => ({
        survey_id: survey.id,
        question: q.question,
        question_type: q.question_type,
        options: q.options ?? null,
        required: !!q.required,
        position: q.position,
      }))
      const { error: qErr } = await supabase.from('survey_questions').insert(rows)
      if (qErr) throw qErr
    }

    return NextResponse.json({ survey })
  } catch (e: unknown) {
    console.error('admin/surveys POST', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
