import { cn } from '@/lib/utils'

type Props = {
  variant?: 'light' | 'dark' | 'auto'
  className?: string
  height?: number
}

export function Logo({ variant = 'auto', className, height = 28 }: Props) {
  const effective = variant === 'auto' ? 'dark' : variant
  const src =
    effective === 'light'
      ? '/branding/Trainzy_logo_light.png'
      : '/branding/Trainzy_logo_dark.png'

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt="Trainzy"
      className={cn('inline-block w-auto', className)}
      style={{ height }}
    />
  )
}