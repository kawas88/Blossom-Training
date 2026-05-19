import * as React from 'react'
import { cn } from '@/lib/utils'

// Trainzy form fields: rounded-2xl (16px corners), 1.5px deep-tinted line by
// default, 2px wisteria border on focus (no ring halo), white surface, deep
// text with faint placeholder. Matches the brand spec for inputs/textareas/
// selects so the whole form system reads as one cohesive family.
const FIELD_BASE =
  'w-full rounded-2xl bg-white px-4 py-3 text-base text-deep transition-all ' +
  'border-[1.5px] border-line ' +
  'placeholder:text-deep/40 ' +
  'focus:outline-none focus:border-wisteria focus:border-2 focus:px-[15px] focus:py-[11px]'

const FIELD_ERROR = 'border-pink focus:border-pink'

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
          className="mb-1.5 block text-sm font-semibold text-deep"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(FIELD_BASE, error && FIELD_ERROR, className)}
        {...rest}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-deep/60">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-pink">{error}</p>}
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
          className="mb-1.5 block text-sm font-semibold text-deep"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(FIELD_BASE, 'resize-y', error && FIELD_ERROR, className)}
        {...rest}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-deep/60">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-pink">{error}</p>}
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
          className="mb-1.5 block text-sm font-semibold text-deep"
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        className={cn(FIELD_BASE, error && FIELD_ERROR, className)}
        {...rest}
      >
        {children}
      </select>
      {hint && !error && <p className="mt-1.5 text-xs text-deep/60">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-pink">{error}</p>}
    </div>
  )
})
