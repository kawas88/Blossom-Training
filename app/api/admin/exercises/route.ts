import { NextResponse } from 'next/server'
import { getAdminSession, requireRole } from '@/lib/auth'
import { getActiveWorkspace } from '@/lib/workspace'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePaidOrActiveTrial } from '@/lib/billing-guard'
import {
  defaultConfigFor,
  ENABLED_EXERCISE_TYPES,
  type ExerciseType,
} from '@/lib/exercises'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isEnabledType(v: unknown): v is ExerciseType {
  return (
    typeof v === 'string' &&
    (ENABLED_EXERCISE_TYPES as readonly string[]).includes(v)
  )
}

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const active = await getActiveWorkspace()
  if (!active) return NextResponse.json({ error: 'No active workspace' }, { status: 400 })
  const workspaceId = active.workspace.id
  const role = await requireRole(workspaceId, session.user_id, 'trainer')
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const billing = await requirePaidOrActiveTrial(workspaceId)
  if (!billing.ok) return billing.response

  try {
    const body = await req.json()
    const title = String(body.title || '').trim()
    const type = body.type
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    if (!isEnabledType(type)) {
      return NextResponse.json({ error: 'Unsupported exercise type' }, { status: 400 })
    }

    const description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null
    const config =
      body.config && typeof body.config === 'object'
        ? body.config
        : defaultConfigFor(type)

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        workspace_id: workspaceId,
        type,
        title,
        description,
        config,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ exercise: data })
  } catch (e: unknown) {
    console.error('admin/exercises POST', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
