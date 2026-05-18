'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

type Props = {
  workspaceId: string
  initialName: string
  initialFocus: string[]
  firstName: string
}

const FOCUS_OPTIONS = [
  'Early childhood / Nursery',
  'Education / Teaching',
  'Corporate / Professional',
  'Healthcare',
  'Wellbeing / Coaching',
  'Other',
]

export function OnboardingWizard({
  workspaceId,
  initialName,
  initialFocus,
  firstName,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState(initialName)
  const [focus, setFocus] = useState<string[]>(initialFocus)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveAndNext(patch: { name?: string; training_focus?: string[]; markOnboarded?: boolean }) {
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { workspace_id: workspaceId }
      if (typeof patch.name === 'string') body.name = patch.name
      if (Array.isArray(patch.training_focus)) body.training_focus = patch.training_focus
      if (patch.markOnboarded) body.onboarded = true
      const res = await fetch('/api/admin/workspace/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Could not save')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      throw e
    } finally {
      setSubmitting(false)
    }
  }

  async function submitStep1() {
    if (!name.trim()) {
      setError('Please give your workspace a name.')
      return
    }
    try {
      await saveAndNext({ name: name.trim() })
      setStep(2)
    } catch {}
  }

  async function submitStep2(skip = false) {
    try {
      await saveAndNext({ training_focus: skip ? [] : focus })
      setStep(3)
    } catch {}
  }

  async function finish(target: string) {
    try {
      await saveAndNext({ markOnboarded: true })
      router.push(target)
      router.refresh()
    } catch {}
  }

  return (
    <div className="px-6 md:px-10 py-10 md:py-20">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-center justify-between">
          <div className="font-mono text-xs tracking-[0.25em] uppercase text-ink/60">
            Trainzy · Setup
          </div>
          <ol className="flex items-center gap-2 text-xs text-ink/50">
            {[1, 2, 3].map((n) => (
              <li
                key={n}
                className={cn(
                  'h-1.5 w-6 rounded-full transition-colors',
                  n <= step ? 'bg-sage' : 'bg-ink/15',
                )}
                aria-label={`Step ${n}`}
              />
            ))}
          </ol>
        </header>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section
              key="step-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-serif text-4xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
                Let&rsquo;s set up <span className="italic-sage">your space.</span>
              </h1>
              <p className="mt-3 text-ink/70 text-balance">
                This is where your trainings will live. You can change the name anytime.
              </p>
              <div className="mt-8 rounded-2xl bg-white border border-ink/10 p-6">
                <Input
                  label="Workspace name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  maxLength={60}
                />
              </div>
              {error && (
                <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
                  {error}
                </div>
              )}
              <div className="mt-6">
                <Button size="lg" onClick={submitStep1} disabled={submitting}>
                  {submitting ? 'Saving…' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="step-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-serif text-4xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
                What kind of training <span className="italic-sage">do you run?</span>
              </h1>
              <p className="mt-3 text-ink/70 text-balance">
                Pick anything that fits. Helps us tailor things later.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((opt) => {
                  const selected = focus.includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setFocus((f) =>
                          selected ? f.filter((x) => x !== opt) : [...f, opt],
                        )
                      }
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-medium border transition-all',
                        selected
                          ? 'bg-ink text-cream border-ink scale-[1.03]'
                          : 'bg-white text-ink border-ink/15 hover:bg-sand/40',
                      )}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
              {error && (
                <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
                  {error}
                </div>
              )}
              <div className="mt-8 flex items-center gap-3">
                <Button size="lg" onClick={() => submitStep2(false)} disabled={submitting}>
                  {submitting ? 'Saving…' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => submitStep2(true)}
                  disabled={submitting}
                  className="text-sm text-ink/60 hover:text-ink underline underline-offset-2"
                >
                  Skip
                </button>
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="step-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-serif text-4xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
                Welcome to Trainzy, <span className="italic-sage">{firstName}.</span>
              </h1>
              <p className="mt-3 text-ink/70 text-balance">
                You&rsquo;ve got 14 days of free Trainzy access. No card needed. Let&rsquo;s create your first training.
              </p>
              {error && (
                <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
                  {error}
                </div>
              )}
              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Button
                  size="lg"
                  onClick={() => finish('/admin/trainings/new')}
                  disabled={submitting}
                >
                  Create your first training
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => finish('/admin')}
                  disabled={submitting}
                  className="text-sm text-ink/60 hover:text-ink underline underline-offset-2"
                >
                  Take me to the dashboard
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <footer className="mt-16 text-center">
          <Link
            href="/admin"
            className="text-xs text-ink/40 hover:text-ink/70"
          >
            Skip setup for now
          </Link>
        </footer>
      </div>
    </div>
  )
}
