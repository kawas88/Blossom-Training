import { NextResponse } from 'next/server'
import { getAdminSession, requireRole } from '@/lib/auth'
import { getActiveWorkspace } from '@/lib/workspace'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const active = await getActiveWorkspace()
  if (!active) return NextResponse.json({ error: 'No active workspace' }, { status: 400 })
  const workspaceId = active.workspace.id
  const role = await requireRole(workspaceId, session.user_id, 'trainer')
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const title = String(body.title || '').trim()
    const format = body.format === 'prompts' ? 'prompts' : 'matching'
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

    const { data: ice, error: iceErr } = await supabase
      .from('icebreakers')
      .insert({
        workspace_id: workspaceId,
        title,
        format,
        instructions: body.instructions || null,
        show_live_wall: body.show_live_wall ?? true,
      })
      .select('*')
      .single()
    if (iceErr) throw iceErr

    if (format === 'matching') {
      const cats = (body.categories || []) as IncomingCategory[]
      const items = (body.items || []) as IncomingItem[]
      const keyToId: Record<string, string> = {}
      for (const c of cats) {
        const { data, error } = await supabase
          .from('icebreaker_categories')
          .insert({ icebreaker_id: ice.id, label: c.label, position: c.position })
          .select('id')
          .single()
        if (error) throw error
        keyToId[c.key] = (data as { id: string }).id
      }
      if (items.length > 0) {
        const itemRows = items.map((it) => ({
          icebreaker_id: ice.id,
          text: it.text,
          correct_category_id: keyToId[it.correct_category_key] || null,
          tag_label: it.tag_label,
          tag_color: it.tag_color,
          position: it.position,
        }))
        const { error: insErr } = await supabase.from('icebreaker_items').insert(itemRows)
        if (insErr) throw insErr
      }
    } else {
      const prompts = (body.prompts || []) as IncomingPrompt[]
      if (prompts.length > 0) {
        const rows = prompts.map((p) => ({
          icebreaker_id: ice.id,
          prompt: p.prompt,
          answer_type: p.answer_type,
          position: p.position,
        }))
        const { error: insErr } = await supabase.from('icebreaker_prompts').insert(rows)
        if (insErr) throw insErr
      }
    }

    return NextResponse.json({ icebreaker: ice })
  } catch (e: unknown) {
    console.error('admin/icebreakers POST', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
