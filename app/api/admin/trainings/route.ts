import { NextResponse } from 'next/server'
import { getAdminSession, requireRole } from '@/lib/auth'
import { getActiveWorkspace } from '@/lib/workspace'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateJoinCode, slugify } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    const title = String(body.title || '').trim()
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

    const supabase = createAdminClient()
    const baseSlug = slugify(title) || 'training'
    const baseCodePrefix = baseSlug.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'T'

    // Verify FK icebreaker_id / survey_id belong to this workspace
    if (body.icebreaker_id) {
      const { data: ice } = await supabase
        .from('icebreakers')
        .select('id')
        .eq('id', body.icebreaker_id)
        .eq('workspace_id', workspaceId)
        .maybeSingle()
      if (!ice) return NextResponse.json({ error: 'Icebreaker not found' }, { status: 404 })
    }
    if (body.survey_id) {
      const { data: sv } = await supabase
        .from('surveys')
        .select('id')
        .eq('id', body.survey_id)
        .eq('workspace_id', workspaceId)
        .maybeSingle()
      if (!sv) return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    let inserted: { id: string; slug: string; join_code: string } | null = null
    let attempts = 0
    while (attempts < 5) {
      const trySlug = attempts === 0 ? baseSlug : `${baseSlug}-${attempts + 1}`
      const tryCode = generateJoinCode(baseCodePrefix)
      const { data, error } = await supabase
        .from('trainings')
        .insert({
          workspace_id: workspaceId,
          title,
          nursery_name: body.nursery_name || null,
          trainer_name: body.trainer_name || null,
          description: body.description || null,
          icebreaker_id: body.icebreaker_id || null,
          survey_id: body.survey_id || null,
          scheduled_at: body.scheduled_at || null,
          slug: trySlug,
          join_code: tryCode,
          status: 'draft',
        })
        .select('*')
        .single()
      if (!error && data) {
        inserted = data as { id: string; slug: string; join_code: string }
        break
      }
      attempts++
    }
    if (!inserted) {
      return NextResponse.json({ error: 'Could not create training (collision)' }, { status: 500 })
    }
    return NextResponse.json({ training: inserted })
  } catch (e: unknown) {
    console.error('admin/trainings POST error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
