import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Trainzy — Engaging training that doesn't feel like training",
  description:
    'Build short, engaging training sessions for your team. Quizzes, reflections, word clouds, branching scenarios — all built for real human moments.',
  openGraph: {
    title: "Trainzy — Engaging training that doesn't feel like training",
    description:
      'Build short, engaging training sessions for your team. Quizzes, reflections, word clouds, branching scenarios — all built for real human moments.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="min-h-screen antialiased bg-blush text-deep">
        {children}
      </body>
    </html>
  )
}
