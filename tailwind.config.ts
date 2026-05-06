import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0F1419',
        cream: '#FAF7F2',
        sage: '#1D6E52',
        terracotta: '#C9624A',
        sand: '#E8DDC9',
        graphite: '#1A1A1A',
        success: '#10B981',
        error: '#EF4444',
        warn: '#F59E0B',
        'domain-comm': '#3B82F6',
        'domain-gross': '#10B981',
        'domain-fine': '#F59E0B',
        'domain-problem': '#8B5CF6',
        'domain-social': '#FB7185',
      },
      fontFamily: {
        serif: ['var(--font-dm-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightish: '-0.02em',
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
      },
      animation: {
        'fade-in': 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        shake: 'shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 20, 25, 0.04), 0 4px 16px rgba(15, 20, 25, 0.04)',
        card: '0 1px 3px rgba(15, 20, 25, 0.06), 0 8px 24px rgba(15, 20, 25, 0.04)',
      },
      backgroundImage: {
        'paper-texture':
          'radial-gradient(circle, rgba(15,20,25,0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        paper: '24px 24px',
      },
    },
  },
  plugins: [],
}

export default config
