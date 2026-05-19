import { cn } from '@/lib/utils'

export type BrandShapeKind =
  | 'cross'
  | 'flower'
  | 'star'
  | 'star5'
  | 'blob'
  | 'hexagon'
  | 'cloud'
  | 'stack'
  | 'sparkle'

export type BrandShapeColor =
  | 'pink'
  | 'orange'
  | 'wisteria'
  | 'sunglow'
  | 'mint'
  | 'blue'
  | 'mauve'
  | 'deep'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type Props = {
  kind: BrandShapeKind
  color: BrandShapeColor
  size?: Size
  className?: string
  /** Adds a soft mascot face — use sparingly, max once per page. */
  withEyes?: boolean
  /** Decorative tilt in degrees. */
  rotate?: number
  /** Optional explicit pixel size (overrides `size`). */
  px?: number
}

const SIZE_PX: Record<Size, number> = {
  xs: 16,
  sm: 24,
  md: 40,
  lg: 64,
  xl: 96,
}

const COLOR_HEX: Record<BrandShapeColor, string> = {
  pink: '#ff6b9d',
  orange: '#ff7a3c',
  wisteria: '#b497de',
  sunglow: '#f8d278',
  mint: '#7fe4c3',
  blue: '#6b88f0',
  mauve: '#6e5a6f',
  deep: '#1d0d2a',
}

/**
 * Decorative brand shapes drawn from the Trainzy brand board.
 * Each shape is a small inline SVG, recolourable via the `color` prop.
 * Use sparingly — at most 2–3 per screen, and never overlap critical UI.
 */
export function BrandShape({
  kind,
  color,
  size = 'md',
  className,
  withEyes = false,
  rotate,
  px,
}: Props) {
  const dimension = px ?? SIZE_PX[size]
  const fill = COLOR_HEX[color]

  return (
    <span
      className={cn('inline-flex shrink-0 leading-none', className)}
      style={{
        width: dimension,
        height: dimension,
        transform: typeof rotate === 'number' ? `rotate(${rotate}deg)` : undefined,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        {renderShape(kind, fill)}
        {withEyes && <MascotEyes kind={kind} />}
      </svg>
    </span>
  )
}

function renderShape(kind: BrandShapeKind, fill: string) {
  switch (kind) {
    case 'cross':
      // 4-petal sparkle / clover — the signature Trainzy shape
      return (
        <path
          d="M50 0 C 50 25, 50 33, 67 50 C 83 50, 92 50, 100 50 C 92 50, 83 50, 67 50 C 50 67, 50 75, 50 100 C 50 75, 50 67, 33 50 C 17 50, 8 50, 0 50 C 8 50, 17 50, 33 50 C 50 33, 50 25, 50 0 Z"
          fill={fill}
        />
      )
    case 'flower':
      // 8-bump scalloped flower
      return (
        <g fill={fill}>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 360) / 8
            return (
              <circle
                key={i}
                cx={50 + 30 * Math.cos((angle * Math.PI) / 180)}
                cy={50 + 30 * Math.sin((angle * Math.PI) / 180)}
                r={18}
              />
            )
          })}
          <circle cx={50} cy={50} r={28} />
        </g>
      )
    case 'star':
      // 7-point fuzzy starburst
      return (
        <path
          d={starPath(50, 50, 7, 50, 22)}
          fill={fill}
          strokeLinejoin="round"
          stroke={fill}
          strokeWidth={6}
        />
      )
    case 'star5':
      // Classic 5-point star with rounded joins
      return (
        <path
          d={starPath(50, 50, 5, 48, 20)}
          fill={fill}
          strokeLinejoin="round"
          stroke={fill}
          strokeWidth={6}
        />
      )
    case 'blob':
      // Soft asymmetric blob
      return (
        <path
          d="M50 8 C 78 8, 96 26, 92 52 C 88 76, 76 96, 50 94 C 22 92, 6 76, 10 50 C 14 24, 28 8, 50 8 Z"
          fill={fill}
        />
      )
    case 'hexagon':
      // Rounded hexagon
      return (
        <path
          d="M50 8 L 86 28 L 86 72 L 50 92 L 14 72 L 14 28 Z"
          fill={fill}
          strokeLinejoin="round"
          stroke={fill}
          strokeWidth={10}
        />
      )
    case 'cloud':
      // 5-petal puff
      return (
        <g fill={fill}>
          <circle cx={28} cy={55} r={22} />
          <circle cx={50} cy={42} r={26} />
          <circle cx={72} cy={55} r={22} />
          <circle cx={38} cy={68} r={18} />
          <circle cx={62} cy={68} r={18} />
        </g>
      )
    case 'stack':
      // Three stacked rounded rectangles
      return (
        <g fill={fill}>
          <rect x={14} y={18} width={72} height={18} rx={9} />
          <rect x={14} y={42} width={72} height={18} rx={9} />
          <rect x={14} y={66} width={72} height={18} rx={9} />
        </g>
      )
    case 'sparkle':
      // Small 4-pointed twinkle (slimmer than `cross`)
      return (
        <path
          d="M50 10 C 50 38, 50 42, 60 50 C 76 50, 84 50, 90 50 C 84 50, 76 50, 60 50 C 50 58, 50 62, 50 90 C 50 62, 50 58, 40 50 C 24 50, 16 50, 10 50 C 16 50, 24 50, 40 50 C 50 42, 50 38, 50 10 Z"
          fill={fill}
        />
      )
  }
}

function MascotEyes({ kind }: { kind: BrandShapeKind }) {
  // Center the eyes a bit higher than dead-center, with a subtle innocent
  // expression. Position adjusts slightly per shape because some shapes
  // (cloud, stack) have very different visual centers.
  const center = kind === 'cloud' ? { y: 48 } : kind === 'stack' ? { y: 50 } : { y: 50 }
  const eyeY = center.y
  return (
    <g>
      <circle cx={38} cy={eyeY} r={5.5} fill="#1d0d2a" />
      <circle cx={62} cy={eyeY} r={5.5} fill="#1d0d2a" />
      <circle cx={36.5} cy={eyeY - 1.5} r={1.5} fill="#ffffff" />
      <circle cx={60.5} cy={eyeY - 1.5} r={1.5} fill="#ffffff" />
    </g>
  )
}

function starPath(
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number,
): string {
  let path = ''
  const step = Math.PI / spikes
  let angle = -Math.PI / 2
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    path += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `
    angle += step
  }
  return path + 'Z'
}
