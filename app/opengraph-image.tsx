import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = "Trainzy — Engaging training that doesn't feel like training"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Trainzy OG card — deep purple bg, mascot shapes scattered, light wordmark,
// tagline. Used for link-share previews across Slack/Twitter/etc.
export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1d0d2a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Scattered shapes — inline SVG for ImageResponse compatibility */}
        <div style={{ position: 'absolute', top: 80, right: 100, display: 'flex' }}>
          {/* sunglow flower */}
          <svg width="120" height="120" viewBox="0 0 100 100">
            <g transform="rotate(-15 50 50)">
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx="50"
                  cy="22"
                  rx="14"
                  ry="22"
                  fill="#f8d278"
                  transform={`rotate(${deg} 50 50)`}
                />
              ))}
              <circle cx="50" cy="50" r="10" fill="#1d0d2a" />
            </g>
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: 110, right: 220, display: 'flex' }}>
          {/* pink star */}
          <svg width="90" height="90" viewBox="0 0 100 100">
            <polygon
              points="50,8 60,38 92,38 66,57 76,88 50,68 24,88 34,57 8,38 40,38"
              fill="#ff6b9d"
              transform="rotate(15 50 50)"
            />
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: 80, left: 140, display: 'flex' }}>
          {/* mint blob */}
          <svg width="100" height="100" viewBox="0 0 100 100">
            <path
              d="M 50,8 Q 90,15 88,50 Q 92,88 50,90 Q 12,88 12,52 Q 10,12 50,8 Z"
              fill="#7fe4c3"
              transform="rotate(-8 50 50)"
            />
          </svg>
        </div>
        <div style={{ position: 'absolute', top: 360, left: 80, display: 'flex' }}>
          {/* wisteria cross */}
          <svg width="80" height="80" viewBox="0 0 100 100">
            <path
              d="M 35,8 L 65,8 L 65,35 L 92,35 L 92,65 L 65,65 L 65,92 L 35,92 L 35,65 L 8,65 L 8,35 L 35,35 Z"
              fill="#b497de"
            />
          </svg>
        </div>

        {/* Wordmark — sparkle + Trainzy */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <svg width="56" height="56" viewBox="0 0 48 48">
            <g transform="rotate(-12 24 24)">
              {[0, 90, 180, 270].map((deg) => (
                <path
                  key={deg}
                  d="M 24 4 C 20 18 20 18 4 24 C 20 30 20 30 24 44 C 28 30 28 30 44 24 C 28 18 28 18 24 4 Z"
                  fill="#b497de"
                  transform={`rotate(${deg} 24 24)`}
                  opacity={0.9}
                />
              ))}
            </g>
          </svg>
          <span
            style={{
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            Trainzy
          </span>
        </div>

        {/* Tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 880 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: '#ffffff',
            }}
          >
            Engaging training that doesn&rsquo;t{' '}
            <span style={{ color: '#b497de', fontStyle: 'italic' }}>feel like training.</span>
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#ffe4dd',
              fontWeight: 500,
              marginTop: 8,
            }}
          >
            trainzy.io
          </div>
        </div>
      </div>
    ),
    size,
  )
}
