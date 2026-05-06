import * as React from 'react'
import { cn } from '@/lib/utils'

type Props = {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-white/40 px-6 py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sand/60 text-ink/60">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-xl tracking-tightish text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-ink/60">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
