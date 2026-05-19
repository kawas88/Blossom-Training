'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, ExternalLink, Presentation } from 'lucide-react'
import { QrCode } from '@/components/QrCode'

type Props = {
  joinCode: string
  joinUrl: string
  slug: string
  status: 'draft' | 'live' | 'closed'
}

// Single source of truth for "how does a participant join this training".
// Shown on the Overview tab — QR for in-room sessions, code for reading
// aloud, link for sending in chat, presenter view for the big screen.
// Heavy borrow from Slido/Wooclap composition, but the QR is colored to
// match the rest of the brand instead of plain black/white.
export function JoinShareCard({ joinCode, joinUrl, slug, status }: Props) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const isLive = status === 'live'

  function copy(field: 'code' | 'link', value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="rounded-3xl bg-deep text-white overflow-hidden">
      <div className="px-6 py-6 md:px-8 md:py-8 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-center">
        <div className="flex justify-center md:justify-start">
          <QrCode value={joinUrl} size={160} />
        </div>

        <div className="space-y-4 min-w-0">
          <div>
            <p className="font-mono text-[10px] tracking-eyebrow uppercase text-white/60">
              Join code
            </p>
            <button
              onClick={() => copy('code', joinCode)}
              className="mt-1 inline-flex items-center gap-3 group"
              aria-label="Copy join code"
            >
              <span className="font-serif text-4xl md:text-5xl font-extrabold tracking-[0.18em] text-white">
                {joinCode}
              </span>
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                {copied === 'code' ? (
                  <Check className="h-4 w-4 text-mint" strokeWidth={3} />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-white/80" />
                )}
              </span>
            </button>
            <p className="mt-2 text-xs text-white/55">
              Participants enter this at <span className="font-semibold text-white/80">trainzy.io</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => copy('link', joinUrl)}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              {copied === 'link' ? (
                <Check className="h-3.5 w-3.5 text-mint" strokeWidth={3} />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied === 'link' ? 'Link copied' : 'Copy link'}
            </button>

            <Link
              href={`/?code=${joinCode}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Preview as participant
            </Link>

            <Link
              href={`/present/${slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full bg-wisteria hover:bg-wisteria/90 px-4 py-2 text-sm font-semibold text-white transition-colors"
              aria-label="Open big-screen presenter view in a new tab"
            >
              <Presentation className="h-3.5 w-3.5" />
              Presenter view
            </Link>
          </div>

          {!isLive && (
            <p className="text-xs text-sunglow">
              {status === 'draft'
                ? 'This training is in draft — go live so participants can join.'
                : 'This training is closed — participants can no longer join.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
