import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'live' | 'draft' | 'closed' | 'success' | 'error' | 'sage' | 'mono'

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant
}

const variants: Record<Variant, string> = {
  default: 'bg-sand/60 text-ink',
  live: 'bg-sage/15 text-sage',
  draft: 'bg-ink/10 text-ink/70',
  closed: 'bg-ink/80 text-cream',
  success: 'bg-success/15 text-success',
  error: 'bg-error/10 text-error',
  sage: 'bg-sage text-cream',
  mono: 'bg-ink text-cream font-mono tracking-wider',
}

export function Pill({ variant = 'default', className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
