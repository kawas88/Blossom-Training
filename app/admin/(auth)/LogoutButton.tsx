'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LogoutButton({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      router.push('/admin/login')
      router.refresh()
    }
  }

  if (compact) {
    return (
      <button
        onClick={logout}
        disabled={busy}
        className="flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white"
        aria-label="Log out"
      >
        <LogOut className="h-3.5 w-3.5" />
        Log out
      </button>
    )
  }

  // Sits inside the deep-purple sidebar; needs to read against that surface.
  return (
    <button
      onClick={logout}
      disabled={busy}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50',
        className,
      )}
    >
      <LogOut className="h-3.5 w-3.5" />
      Log out
    </button>
  )
}
