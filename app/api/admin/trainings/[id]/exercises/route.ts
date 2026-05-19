import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function loadTrainingAccess(id: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('trainings')
    .select('workspace_id')
    .eq('id', id)
    .maybeSingle()
  return { supabase, training: data }
}

// Add an exercise to the end of the sequence.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { supabase, training } = await loadTrainingAccess(params.id)
  if (!training) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(training.workspace_id, 'trainer')
  if (!access.ok) return workspaceErrorResponse(access)

  const body = await req.json()
  const exerciseId = String(body.exercise_id || '').trim()
  if (!exerciseId) {
    return NextResponse.json({ error: 'exercise_id required' }, { status: 400 })
  }

  const { data: ex } = await supabase
    .from('exercises')
    .select('id, workspace_id')
    .eq('id', exerciseId)
    .maybeSingle()
  if (!ex || ex.workspace_id !== training.workspace_id) {
    return NextResponse.json({ error: 'Exercise not in this workspace' }, { status: 404 })
  }

  // Determine next position.
  const { data: existing } = await supabase
    .from('training_exercises')
    .select('position')
    .eq('training_id', params.id)
    .order('position', { ascending: false })
    .limit(1)
  const nextPosition = (existing?.[0]?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('training_exercises')
    .insert({
      training_id: params.id,
      exercise_id: exerciseId,
      position: nextPosition,
      required: !!body.required,
    })
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Exercise is already part of this training' },
        { status: 409 },
      )
    }
    console.error('training_exercises insert', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
  return NextResponse.json({ link: data })
}

// Bulk reorder. Body: { items: [{ link_id, position }, ...] }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { supabase, training } = await loadTrainingAccess(params.id)
  if (!training) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(training.workspace_id, 'trainer')
  if (!access.ok) return workspaceErrorResponse(access)

  const body = await req.json()
  const items = Array.isArray(body.items) ? body.items : []
  if (items.length === 0) return NextResponse.json({ ok: true })

  // The (training_id, position) unique constraint forces a two-step update:
  // bump everything to a high range first, then assign final positions.
  const HIGH_OFFSET = 1_000_000
  for (let i = 0; i < items.length; i++) {
    const linkId = String(items[i]?.link_id || '')
    if (!linkId) continue
    const { error } = await supabase
      .from('training_exercises')
      .update({ position: HIGH_OFFSET + i })
      .eq('id', linkId)
      .eq('training_id', params.id)
    if (error) {
      console.error('reorder bump', error)
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
  }
  for (let i = 0; i < items.length; i++) {
    const linkId = String(items[i]?.link_id || '')
    if (!linkId) continue
    const position = Number(items[i]?.position)
    if (!Number.isFinite(position) || position < 0) continue
    const { error } = await supabase
      .from('training_exercises')
      .update({ position })
      .eq('id', linkId)
      .eq('training_id', params.id)
    if (error) {
      console.error('reorder final', error)
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
  }
  return NextResponse.json({ ok: true })
}
