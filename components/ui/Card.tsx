import * as React from 'react'
import { cn } from '@/lib/utils'

type Props = React.HTMLAttributes<HTMLDivElement> & {
  padded?: boolean
}

export function Card({ padded = true, className, children, ...rest }: Props) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white border border-ink/10 shadow-soft',
        padded && 'p-6 md:p-8',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-serif text-2xl tracking-tightish text-ink', className)} {...rest}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-1 text-sm text-ink/60', className)} {...rest}>
      {children}
    </p>
  )
}
