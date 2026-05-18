import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type IncomingCategory = { position: number; label: string; key: string }
type IncomingItem = {
  position: number
  text: string
  correct_category_key: string
  tag_label: string | null
  tag_color: string | null
}
type IncomingPrompt = {
  position: number
  prompt: string
  answer_type: 'short_text' | 'long_text' | 'word'
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('icebreakers')
    .select('workspace_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(existing.workspace_id, 'trainer')
  if (!access.ok) return workspaceErrorResponse(access)

  try {
    const body = await req.json()

    const title = String(body.title || '').trim()
    const format = body.format === 'prompts' ? 'prompts' : 'matching'
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

    const { error: updErr } = await supabase
      .from('icebreakers')
      .update({
        title,
        format,
        instructions: body.instructions || null,
        show_live_wall: body.show_live_wall ?? true,
      })
      .eq('id', params.id)
    if (updErr) throw updErr

    // Delete children, then re-insert
    await supabase.from('icebreaker_categories').delete().eq('icebreaker_id', params.id)
    await supabase.from('icebreaker_items').delete().eq('icebreaker_id', params.id)
    await supabase.from('icebreaker_prompts').delete().eq('icebreaker_id', params.id)

    if (format === 'matching') {
      const cats = (body.categories || []) as IncomingCategory[]
      const items = (body.items || []) as IncomingItem[]
      const keyToId: Record<string, string> = {}
      for (const c of cats) {
        const { data, error } = await supabase
          .from('icebreaker_categories')
          .insert({ icebreaker_id: params.id, label: c.label, position: c.position })
          .select('id')
          .single()
        if (error) throw error
        keyToId[c.key] = (data as { id: string }).id
      }
      if (items.length > 0) {
        const itemRows = items.map((it) => ({
          icebreaker_id: params.id,
          text: it.text,
          correct_category_id: keyToId[it.correct_category_key] || null,
          tag_label: it.tag_label,
          tag_color: it.tag_color,
          position: it.position,
        }))
        const { error } = await supabase.from('icebreaker_items').insert(itemRows)
        if (error) throw error
      }
    } else {
      const prompts = (body.prompts || []) as IncomingPrompt[]
      if (prompts.length > 0) {
        const rows = prompts.map((p) => ({
          icebreaker_id: params.id,
          prompt: p.prompt,
          answer_type: p.answer_type,
          position: p.position,
        }))
        const { error } = await supabase.from('icebreaker_prompts').insert(rows)
        if (error) throw error
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('admin/icebreakers PATCH', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('icebreakers')
    .select('workspace_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(existing.workspace_id, 'admin')
  if (!access.ok) return workspaceErrorResponse(access)
  try {
    const { error } = await supabase.from('icebreakers').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('admin/icebreakers DELETE', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
