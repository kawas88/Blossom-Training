import type { Metadata } from 'next'
import { League_Spartan } from 'next/font/google'
import './globals.css'

// Single product family — League Spartan is a geometric sans that scales
// from display-sized headlines down to body. We load 300–900 so display
// and weight-emphasis (the new wisteria-emphasis pattern) both work.
const leagueSpartan = League_Spartan({
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-league-spartan',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://trainzy.io'),
  title: 'Trainzy — Run training your team will remember.',
  description:
    'Live, interactive sessions for the moments that count — quizzes, reflections, word clouds, branching scenarios. All in one place.',
  openGraph: {
    title: 'Trainzy — Run training your team will remember.',
    description:
      'Live, interactive sessions for the moments that count — quizzes, reflections, word clouds, branching scenarios. All in one place.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={leagueSpartan.variable}>
      <body className="min-h-screen antialiased bg-blush text-deep">
        {children}
      </body>
    </html>
  )
}
