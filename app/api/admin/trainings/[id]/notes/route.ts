import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const { data: training } = await supabase
      .from('trainings')
      .select('workspace_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!training) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const access = await requireWorkspaceAccess(training.workspace_id, 'trainer')
    if (!access.ok) return workspaceErrorResponse(access)

    const body = await req.json()
    const text = String(body.body || '').trim()
    if (!text) return NextResponse.json({ error: 'Note body required' }, { status: 400 })
    const { data, error } = await supabase
      .from('trainer_notes')
      .insert({
        training_id: params.id,
        body: text,
        participant_id: body.participant_id || null,
        item_id: body.item_id || null,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ note: data })
  } catch (e: unknown) {
    console.error('notes POST error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
