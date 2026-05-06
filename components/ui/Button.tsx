import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-cream hover:bg-sage focus-visible:ring-sage/30 disabled:bg-ink/40',
  secondary:
    'bg-cream text-ink border border-ink/20 hover:bg-sand/40 focus-visible:ring-ink/20 disabled:opacity-50',
  ghost:
    'bg-transparent text-ink hover:bg-sand/40 focus-visible:ring-ink/20 disabled:opacity-50',
  danger:
    'bg-error text-cream hover:bg-error/90 focus-visible:ring-error/30 disabled:bg-error/40',
}

const sizes: Record<Size, string> = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3 text-base',
}

export const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-all',
        'focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
