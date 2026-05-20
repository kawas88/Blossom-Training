import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // -----------------------------------------------------------------
        // New Trainzy palette (canonical names)
        // -----------------------------------------------------------------
        blush: '#fff2f0',         // primary background
        'blush-deep': '#ffe4dd',  // soft card background, hover fill
        deep: '#1d0d2a',          // primary text, headings
        'deep-soft': '#4a3559',   // secondary text
        wisteria: '#b497de',      // brand accent
        sunglow: '#f8d278',       // secondary accent
        pink: '#ff6b9d',          // hot pink — destructive / vibrant
        orange: '#ff7a3c',
        mint: '#7fe4c3',
        blue: '#6b88f0',
        mauve: '#6e5a6f',
        line: 'rgba(29, 13, 42, 0.12)', // hairline borders

        // -----------------------------------------------------------------
        // Legacy token aliases — keep so existing className usage in 80+
        // files renders as the new brand without per-file edits. New code
        // should use the canonical names above.
        // -----------------------------------------------------------------
        ink: '#1d0d2a',           // → deep
        cream: '#fff2f0',         // → blush
        sage: '#b497de',          // → wisteria
        sand: '#ffe4dd',          // → blush-deep
        terracotta: '#ff6b9d',    // → pink
        graphite: '#1d0d2a',

        // Status / semantic
        success: '#7fe4c3',
        error: '#ff6b9d',
        warn: '#f8d278',

        // ASQ-3 domain dots — recoloured against the new palette while
        // keeping each domain visually distinct.
        'domain-comm': '#6b88f0',
        'domain-gross': '#7fe4c3',
        'domain-fine': '#f8d278',
        'domain-problem': '#b497de',
        'domain-social': '#ff6b9d',
      },
      fontFamily: {
        // Single product family. League Spartan from Google Fonts —
        // geometric sans that scales from display headlines to body. The
        // legacy `serif`/`mono` aliases keep pointing at the same family
        // so existing className usage (`font-serif`, `font-mono`) renders
        // correctly; we adjust weight + tracking via globals.css.
        sans: ['var(--font-league-spartan)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-league-spartan)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-league-spartan)', 'system-ui', 'sans-serif'],
        display: ['var(--font-league-spartan)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightish: '-0.02em',
        eyebrow: '0.08em',
      },
      borderRadius: {
        '4xl': '32px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        shake: 'shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        wiggle: 'wiggle 3s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(29, 13, 42, 0.04), 0 4px 16px rgba(29, 13, 42, 0.04)',
        card: '0 1px 3px rgba(29, 13, 42, 0.06), 0 8px 24px rgba(29, 13, 42, 0.04)',
        glow: '0 8px 32px rgba(180, 151, 222, 0.35)',
      },
    },
  },
  plugins: [],
}

export default config
