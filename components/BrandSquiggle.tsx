import { cn } from '@/lib/utils'

type Color = 'wisteria' | 'sunglow' | 'pink'
type Variant = 'loop' | 'wave' | 'curl'

type Props = {
  color?: Color
  variant?: Variant
  className?: string
  strokeWidth?: number
}

const COLOR_HEX: Record<Color, string> = {
  wisteria: '#b497de',
  sunglow: '#f8d278',
  pink: '#ff6b9d',
}

/**
 * The looping line-art squiggle from the Trainzy brand board. Renders as
 * inline SVG with stroke (no fill), rounded caps/joins, and
 * non-scaling-stroke so the line stays consistent across sizes. Use
 * sparingly — one or two per moment, never crowding critical UI.
 */
export function BrandSquiggle({
  color = 'wisteria',
  variant = 'loop',
  className,
  strokeWidth = 8,
}: Props) {
  const stroke = COLOR_HEX[color]
  return (
    <svg
      viewBox="0 0 400 100"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('pointer-events-none', className)}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={pathFor(variant)} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function pathFor(variant: Variant): string {
  switch (variant) {
    case 'loop':
      // One smooth loose curve with a single playful loop near the right.
      return 'M 10 70 C 90 10, 160 110, 240 50 C 280 20, 320 40, 320 70 C 320 100, 270 100, 270 65 C 270 35, 320 30, 390 60'
    case 'wave':
      // Soft sine-ish wave across the width.
      return 'M 10 50 C 60 10, 110 90, 160 50 S 260 10, 310 50 S 390 90, 395 50'
    case 'curl':
      // Tight curl on one side trailing into a long sweep.
      return 'M 30 60 C 30 20, 90 20, 90 60 C 90 100, 30 100, 30 60 M 90 60 C 160 60, 240 30, 390 70'
  }
}
