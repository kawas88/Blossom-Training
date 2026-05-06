import * as React from 'react'
import { cn } from '@/lib/utils'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const inputId = id || rest.name || React.useId()
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-base text-ink',
          'placeholder:text-ink/40',
          'focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20',
          'transition-all',
          error && 'border-error focus:border-error focus:ring-error/20',
          className,
        )}
        {...rest}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-ink/60">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  )
})

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const inputId = id || rest.name || React.useId()
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-base text-ink',
          'placeholder:text-ink/40',
          'focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20',
          'transition-all resize-y',
          error && 'border-error focus:border-error focus:ring-error/20',
          className,
        )}
        {...rest}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-ink/60">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  )
})

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  error?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, children, ...rest },
  ref,
) {
  const inputId = id || rest.name || React.useId()
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-base text-ink',
          'focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20',
          'transition-all',
          error && 'border-error focus:border-error focus:ring-error/20',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {hint && !error && <p className="mt-1.5 text-xs text-ink/60">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  )
})
