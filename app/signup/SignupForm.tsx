'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

type Strength = { score: number; label: string; color: string }

function passwordStrength(pw: string): Strength {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map: Strength[] = [
    { score: 0, label: 'Too short', color: 'bg-ink/15' },
    { score: 1, label: 'Weak',      color: 'bg-error' },
    { score: 2, label: 'Fair',      color: 'bg-warn' },
    { score: 3, label: 'Good',      color: 'bg-warn' },
    { score: 4, label: 'Strong',    color: 'bg-sage' },
    { score: 5, label: 'Strong',    color: 'bg-sage' },
  ]
  return map[Math.min(score, 5)]
}

export function SignupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signupKind, setSignupKind] = useState<'self' | 'org'>('self')
  const [terms, setTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const strength = useMemo(() => passwordStrength(password), [password])
  const canSubmit =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password.length >= 8 &&
    terms

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
          signup_kind: signupKind,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not sign you up.')
      router.push('/admin/onboarding')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoComplete="name"
        autoFocus
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <div>
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          hint="8 characters or more."
        />
        {password.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-ink/10 overflow-hidden">
              <div
                className={cn('h-full transition-all', strength.color)}
                style={{ width: `${(strength.score / 5) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink/60">
              {strength.label}
            </span>
          </div>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink mb-2">
          I&rsquo;m signing up for
        </legend>
        <div className="flex gap-2">
          {(
            [
              ['self', 'Myself'],
              ['org', 'My organisation'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSignupKind(value)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium border transition-all',
                signupKind === value
                  ? 'bg-ink text-cream border-ink'
                  : 'bg-cream text-ink border-ink/15 hover:bg-sand/40',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-2 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-ink/30 text-sage focus:ring-sage"
          required
        />
        <span>
          I agree to the Trainzy terms and acknowledge the privacy policy.
        </span>
      </label>

      {error && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || submitting}>
        {submitting ? 'Creating your workspace…' : 'Create your account'}
      </Button>
    </form>
  )
}
