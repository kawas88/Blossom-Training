import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

// All buttons are pill-shaped (rounded-full) — that's a brand signature
// of the new Trainzy identity. Primary action is wisteria + white text;
// secondary is an outlined deep-purple pill; destructive is hot pink.
const variants: Record<Variant, string> = {
  primary:
    'bg-wisteria text-white hover:bg-wisteria/90 focus-visible:ring-wisteria/40 disabled:bg-wisteria/40 disabled:text-white/80',
  secondary:
    'bg-transparent text-deep border-2 border-deep hover:bg-deep hover:text-blush focus-visible:ring-deep/30 disabled:opacity-50',
  ghost:
    'bg-transparent text-deep hover:text-wisteria hover:bg-blush-deep/60 focus-visible:ring-wisteria/20 disabled:opacity-50',
  danger:
    'bg-pink text-white hover:bg-pink/90 focus-visible:ring-pink/40 disabled:bg-pink/40',
}

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm min-h-[36px]',
  md: 'px-6 py-2.5 text-sm min-h-[44px]',
  lg: 'px-8 py-3.5 text-base min-h-[52px]',
}

export const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-blush disabled:cursor-not-allowed',
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
