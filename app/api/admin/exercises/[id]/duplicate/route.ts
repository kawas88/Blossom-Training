import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data: source } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(source.workspace_id, 'trainer')
  if (!access.ok) return workspaceErrorResponse(access)

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      workspace_id: source.workspace_id,
      type: source.type,
      title: `${source.title} (copy)`,
      description: source.description,
      config: source.config,
    })
    .select('*')
    .single()
  if (error) {
    console.error('admin/exercises duplicate', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
  return NextResponse.json({ exercise: data })
}
