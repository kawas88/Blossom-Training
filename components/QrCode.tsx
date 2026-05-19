'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  size?: number
  className?: string
  margin?: number
}

// Renders the QR as an inline data URL so it prints cleanly and never
// needs a network round-trip. `value` should be the full URL (the
// shareable participant join link).
export function QrCode({ value, size = 160, className, margin = 1 }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, {
      width: size,
      margin,
      errorCorrectionLevel: 'M',
      color: { dark: '#1d0d2a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setSrc(url)
      })
      .catch(() => {
        if (!cancelled) setSrc(null)
      })
    return () => {
      cancelled = true
    }
  }, [value, size, margin])

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-2xl bg-white border-[1.5px] border-line overflow-hidden',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Join QR code" width={size} height={size} />
      ) : (
        <div className="h-full w-full animate-pulse bg-blush-deep" />
      )}
    </div>
  )
}
