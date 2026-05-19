import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'
import { countTrainingsUsingExercise } from '@/lib/exercises'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function loadExerciseAccess(id: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('exercises')
    .select('id, workspace_id')
    .eq('id', id)
    .maybeSingle()
  return { supabase, exercise: data }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { supabase, exercise } = await loadExerciseAccess(params.id)
  if (!exercise) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(exercise.workspace_id, 'viewer')
  if (!access.ok) return workspaceErrorResponse(access)
  const { data } = await supabase.from('exercises').select('*').eq('id', params.id).single()
  const trainingCount = await countTrainingsUsingExercise(params.id)
  return NextResponse.json({ exercise: data, trainingCount })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { supabase, exercise } = await loadExerciseAccess(params.id)
  if (!exercise) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(exercise.workspace_id, 'trainer')
  if (!access.ok) return workspaceErrorResponse(access)

  try {
    const body = await req.json()
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.title === 'string' && body.title.trim()) {
      patch.title = body.title.trim()
    }
    if (typeof body.description === 'string') {
      patch.description = body.description.trim() || null
    }
    if (body.config && typeof body.config === 'object') {
      patch.config = body.config
    }
    const { data, error } = await supabase
      .from('exercises')
      .update(patch)
      .eq('id', params.id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ exercise: data })
  } catch (e: unknown) {
    console.error('admin/exercises PATCH', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { supabase, exercise } = await loadExerciseAccess(params.id)
  if (!exercise) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(exercise.workspace_id, 'admin')
  if (!access.ok) return workspaceErrorResponse(access)

  const inUse = await countTrainingsUsingExercise(params.id)
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: 'exercise_in_use',
        message: `This exercise is part of ${inUse} training${inUse === 1 ? '' : 's'}. Remove it from those trainings first.`,
      },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('exercises').delete().eq('id', params.id)
  if (error) {
    console.error('admin/exercises DELETE', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
