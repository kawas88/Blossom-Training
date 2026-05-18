'use client'

import { motion } from 'framer-motion'
import { Check, Heart, Sparkles, ClipboardList, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type HubActivity = {
  id: string
  title: string
  description: string
  completed: boolean
  inProgress: boolean
  icon: 'sparkles' | 'clipboard'
  onTap: () => void
}

type Props = {
  activities: HubActivity[]
  participantName: string | null
}

export function ActivityHub({ activities, participantName }: Props) {
  const allComplete =
    activities.length > 0 && activities.every((a) => a.completed)

  return (
    <div className="px-4 md:px-6 py-8 md:py-12 pb-20">
      <div className="mx-auto max-w-2xl">
        {allComplete ? (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 rounded-2xl bg-white border border-ink/10 p-6 md:p-7 text-center shadow-soft"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage/15">
              <Heart
                className="h-8 w-8 fill-sage text-sage"
                strokeWidth={1.5}
              />
            </div>
            <h2 className="font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
              Thank you for <span className="italic-sage">taking part.</span>
            </h2>
            <p className="mt-3 text-sm md:text-base text-ink/70 text-balance">
              Everything is saved. You can close this tab whenever you&rsquo;re ready — or revisit anything below.
            </p>
          </motion.section>
        ) : (
          <header className="mb-8">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
              {participantName ? `Hi, ${participantName}` : 'Welcome'}
            </p>
            <h1 className="mt-2 font-serif text-4xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
              Your <span className="italic-sage">activities.</span>
            </h1>
            <p className="mt-3 text-sm md:text-base text-ink/70 text-balance">
              Your trainer will tell the room which activity to tap. You can do them in any order, and revisit anything until it&rsquo;s done.
            </p>
          </header>
        )}

        <div className="space-y-3">
          {activities.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.05,
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <ActivityButton
                id={a.id}
                title={a.title}
                description={a.description}
                completed={a.completed}
                inProgress={a.inProgress}
                icon={a.icon}
                onTap={a.onTap}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ActivityButton({
  title,
  description,
  completed,
  inProgress,
  icon,
  onTap,
}: HubActivity) {
  const Icon = icon === 'sparkles' ? Sparkles : ClipboardList
  return (
    <button
      onClick={onTap}
      className={cn(
        'group w-full text-left rounded-2xl border transition-all',
        'p-5 md:p-6 min-h-[112px] flex items-center gap-4 md:gap-5',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30',
        completed
          ? 'bg-sage/5 border-sage/30 hover:bg-sage/10'
          : 'bg-white border-ink/15 hover:border-ink/40 hover:shadow-card active:scale-[0.99]',
      )}
    >
      <div
        className={cn(
          'shrink-0 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl transition-colors',
          completed ? 'bg-sage/15 text-sage' : 'bg-sand/60 text-ink/70',
        )}
      >
        {completed ? (
          <Check className="h-6 w-6" strokeWidth={2.5} />
        ) : (
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-serif text-2xl md:text-3xl tracking-tightish text-ink leading-tight">
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-ink/60 line-clamp-2">{description}</p>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <StatusIndicator completed={completed} inProgress={inProgress} />
        <ArrowRight
          className={cn(
            'h-4 w-4 transition-transform',
            completed
              ? 'text-sage/60'
              : 'text-ink/40 group-hover:translate-x-1',
          )}
        />
      </div>
    </button>
  )
}

function StatusIndicator({
  completed,
  inProgress,
}: {
  completed: boolean
  inProgress: boolean
}) {
  if (completed) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-sage/15 text-sage px-3 py-1 text-xs font-medium">
        Completed
      </span>
    )
  }
  if (inProgress) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-warn/15 text-warn px-3 py-1 text-xs font-medium">
        In progress
      </span>
    )
  }
  return (
    <span className="hidden sm:inline text-xs text-ink/40 font-mono uppercase tracking-wider">
      Tap to start
    </span>
  )
}
