'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type Tab = {
  value: string
  label: string
  count?: number | null
}

type Props = {
  tabs: Tab[]
  value: string
  onChange: (v: string) => void
  className?: string
}

export function Tabs({ tabs, value, onChange, className }: Props) {
  return (
    <div className={cn('border-b border-ink/10', className)}>
      <div className="flex gap-1 overflow-x-auto -mb-px" role="tablist">
        {tabs.map((t) => {
          const active = t.value === value
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={cn(
                'relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
                active
                  ? 'text-ink border-b-2 border-ink'
                  : 'text-ink/60 hover:text-ink border-b-2 border-transparent',
              )}
            >
              {t.label}
              {typeof t.count === 'number' && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    active ? 'bg-ink/10 text-ink' : 'bg-ink/5 text-ink/60',
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
