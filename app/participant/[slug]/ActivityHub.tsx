'use client'

import { motion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'
import { BrandShape, type BrandShapeColor, type BrandShapeKind } from '@/components/BrandShape'
import { BrandSquiggle } from '@/components/BrandSquiggle'
import { cn } from '@/lib/utils'

// Activity kind drives the shape + color used for the icon tile, so each
// exercise type has its own visual character on the hub.
export type HubActivityKind =
  | 'matching'
  | 'quiz'
  | 'reflection'
  | 'word_cloud'
  | 'ranking'
  | 'annotation'
  | 'scenario'
  | 'survey'

export type HubActivity = {
  id: string
  title: string
  description: string
  completed: boolean
  inProgress: boolean
  kind: HubActivityKind
  onTap: () => void
}

type Props = {
  activities: HubActivity[]
  participantName: string | null
}

const KIND_SHAPE: Record<HubActivityKind, { shape: BrandShapeKind; color: BrandShapeColor }> = {
  matching:   { shape: 'hexagon', color: 'mint' },
  quiz:       { shape: 'star',    color: 'sunglow' },
  reflection: { shape: 'cloud',   color: 'mauve' },
  word_cloud: { shape: 'flower',  color: 'wisteria' },
  ranking:    { shape: 'stack',   color: 'blue' },
  annotation: { shape: 'blob',    color: 'pink' },
  scenario:   { shape: 'star5',   color: 'orange' },
  survey:     { shape: 'sparkle', color: 'wisteria' },
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
            className="relative mb-8 rounded-3xl bg-white border-[1.5px] border-line p-6 md:p-8 text-center shadow-card overflow-hidden"
          >
            <BrandShape
              kind="cross"
              color="pink"
              size="lg"
              withEyes
              className="mx-auto mb-4 animate-wiggle"
            />
            <h2 className="font-serif text-3xl md:text-4xl font-extrabold tracking-tightish text-deep leading-tight text-balance">
              Thank you for{' '}
              <span className="relative inline-block">
                <span className="italic-wisteria">taking part.</span>
                <BrandSquiggle
                  variant="wave"
                  color="sunglow"
                  className="absolute -bottom-2 left-0 w-full h-3"
                />
              </span>
            </h2>
            <p className="mt-4 text-sm md:text-base text-deep/70 text-balance">
              Everything is saved. You can close this tab whenever you&rsquo;re
              ready — or revisit anything below.
            </p>
          </motion.section>
        ) : (
          <header className="mb-8">
            <p className="font-mono text-[10px] tracking-eyebrow uppercase text-deep/60">
              {participantName ? `Hi, ${participantName}` : 'Welcome'}
            </p>
            <h1 className="mt-2 font-serif text-4xl md:text-5xl font-extrabold tracking-tightish text-deep leading-tight text-balance">
              Your <span className="italic-wisteria">activities.</span>
            </h1>
            <p className="mt-3 text-sm md:text-base text-deep/70 text-balance">
              Your trainer will tell the room which activity to tap. You can do
              them in any order, and revisit anything until it&rsquo;s done.
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
              <ActivityButton activity={a} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ActivityButton({ activity }: { activity: HubActivity }) {
  const { title, description, completed, inProgress, kind, onTap } = activity
  const { shape, color } = KIND_SHAPE[kind]
  return (
    <button
      onClick={onTap}
      className={cn(
        'group w-full text-left rounded-3xl border-[1.5px] transition-all',
        'p-5 md:p-6 min-h-[112px] flex items-center gap-4 md:gap-5',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-wisteria/30',
        completed
          ? 'bg-wisteria/5 border-wisteria/30 hover:bg-wisteria/10'
          : 'bg-white border-line hover:border-deep/30 hover:shadow-card active:scale-[0.99]',
      )}
    >
      <div
        className={cn(
          'shrink-0 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl transition-colors',
          completed ? 'bg-wisteria/15' : 'bg-blush-deep/60',
        )}
      >
        {completed ? (
          <Check className="h-6 w-6 text-wisteria" strokeWidth={2.5} />
        ) : (
          <BrandShape kind={shape} color={color} size="sm" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-serif text-2xl md:text-3xl font-extrabold tracking-tightish text-deep leading-tight">
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-deep/60 line-clamp-2">{description}</p>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <StatusIndicator completed={completed} inProgress={inProgress} />
        <ArrowRight
          className={cn(
            'h-4 w-4 transition-transform',
            completed
              ? 'text-wisteria/60'
              : 'text-deep/40 group-hover:translate-x-1',
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
      <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-wisteria/15 text-wisteria px-3 py-1 text-xs font-semibold">
        Completed
      </span>
    )
  }
  if (inProgress) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-sunglow/25 text-deep px-3 py-1 text-xs font-semibold">
        In progress
      </span>
    )
  }
  return (
    <span className="hidden sm:inline text-xs text-deep/40 font-mono uppercase tracking-eyebrow">
      Tap to start
    </span>
  )
}
