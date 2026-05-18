import { NextResponse } from 'next/server'
import { switchWorkspace } from '@/lib/workspace'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const workspaceId = String(body.workspace_id || '').trim()
    if (!workspaceId)
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    const ws = await switchWorkspace(workspaceId)
    if (!ws)
      return NextResponse.json({ error: 'Not a member of that workspace' }, { status: 403 })
    return NextResponse.json({ ok: true, workspace: ws })
  } catch (e: unknown) {
    console.error('switch workspace', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
