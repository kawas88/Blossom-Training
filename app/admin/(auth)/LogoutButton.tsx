'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
        className="flex items-center gap-1.5 text-xs text-ink/70 hover:text-ink"
        aria-label="Log out"
      >
        <LogOut className="h-3.5 w-3.5" />
        Log out
      </button>
    )
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={logout}
      disabled={busy}
      className={cn(className)}
    >
      <LogOut className="h-3.5 w-3.5" />
      Log out
    </Button>
  )
}
