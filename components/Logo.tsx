import { cn } from '@/lib/utils'

type Props = {
  variant?: 'light' | 'dark' | 'auto'
  className?: string
  /** When true, render the sparkle mark only (no wordmark). */
  markOnly?: boolean
  /** Optional explicit height in px; width scales proportionally. */
  height?: number
}

// PLACEHOLDER NOTE
// ----------------
// The branding/Trainzy_logo_{light,dark}.svg files in the repo are a
// synthetic re-render — the real designed wordmark hasn't been added
// yet. When the real assets land:
//   1. Drop the PNGs into public/branding/ (so Next can serve them at
//      /branding/Trainzy_logo_{light,dark}.png).
//   2. Flip USE_REAL_ASSET to true below.
// Until then the Logo renders an inline SVG with League Spartan
// typography that matches the rest of the brand.
const USE_REAL_ASSET = false

/**
 * The Trainzy wordmark. The sparkle (4-petal cross) stays wisteria across
 * both variants; only the wordmark colour swaps.
 *   - `dark`  → deep-purple wordmark, for use on blush / white surfaces
 *   - `light` → white wordmark, for use on deep-purple / dark surfaces
 *   - `auto`  → defaults to `dark` (product is light-themed by default)
 */
export function Logo({
  variant = 'auto',
  className,
  markOnly = false,
  height = 28,
}: Props) {
  const effective = variant === 'auto' ? 'dark' : variant
  const wordmarkColor = effective === 'light' ? '#ffffff' : '#1d0d2a'

  if (markOnly) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        role="img"
        aria-label="Trainzy"
        className={cn('inline-block', className)}
        style={{ height, width: 'auto' }}
      >
        <path
          d="M24 0 C 24 12, 24 16, 32 24 C 40 24, 44 24, 48 24 C 44 24, 40 24, 32 24 C 24 32, 24 36, 24 48 C 24 36, 24 32, 16 24 C 8 24, 4 24, 0 24 C 4 24, 8 24, 16 24 C 24 16, 24 12, 24 0 Z"
          fill="#b497de"
        />
      </svg>
    )
  }

  if (USE_REAL_ASSET) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={`/branding/Trainzy_logo_${effective}.png`}
        alt="Trainzy"
        className={cn('inline-block', className)}
        style={{ height, width: 'auto' }}
      />
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 340 80"
      role="img"
      aria-label="Trainzy"
      className={cn('inline-block', className)}
      style={{ height, width: 'auto' }}
    >
      <g transform="translate(8 16)">
        <path
          d="M24 0 C 24 12, 24 16, 32 24 C 40 24, 44 24, 48 24 C 44 24, 40 24, 32 24 C 24 32, 24 36, 24 48 C 24 36, 24 32, 16 24 C 8 24, 4 24, 0 24 C 4 24, 8 24, 16 24 C 24 16, 24 12, 24 0 Z"
          fill="#b497de"
        />
      </g>
      <text
        x="78"
        y="56"
        fontFamily="var(--font-league-spartan), system-ui, sans-serif"
        fontWeight={800}
        fontSize={48}
        letterSpacing={-1.5}
        fill={wordmarkColor}
      >
        Trainzy
      </text>
    </svg>
  )
}
