'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Check, Plus } from 'lucide-react'
import type { Workspace, WorkspaceRole } from '@/lib/types'

type Props = {
  active: Workspace
  memberships: { workspace: Workspace; role: WorkspaceRole }[]
}

export function WorkspaceSwitcher({ active, memberships }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onClick)
      document.addEventListener('keydown', onKey)
      return () => {
        document.removeEventListener('mousedown', onClick)
        document.removeEventListener('keydown', onKey)
      }
    }
  }, [open])

  async function switchTo(workspaceId: string) {
    if (workspaceId === active.id || switching) return
    setSwitching(workspaceId)
    try {
      const res = await fetch('/api/admin/workspace/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId }),
      })
      if (!res.ok) throw new Error('Could not switch workspace')
      setOpen(false)
      router.push('/admin')
      router.refresh()
    } catch {
      setSwitching(null)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-ink/10 bg-white/60 hover:bg-white px-3 py-2.5 text-left transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-ink/50">
            Workspace
          </p>
          <p className="truncate text-sm font-medium text-ink">{active.name}</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-ink/40 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 z-40 rounded-2xl border border-ink/10 bg-white shadow-card overflow-hidden">
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {memberships.map(({ workspace, role }) => {
              const isActive = workspace.id === active.id
              return (
                <li key={workspace.id}>
                  <button
                    onClick={() => switchTo(workspace.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-sand/40 transition-colors"
                    role="option"
                    aria-selected={isActive}
                    disabled={switching !== null}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {workspace.name}
                      </p>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-ink/50">
                        {role}
                      </p>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-sage shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-ink/5">
            <Link
              href="/admin/workspaces/new"
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-sand/40 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Plus className="h-4 w-4 text-ink/60" />
              Create new workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
