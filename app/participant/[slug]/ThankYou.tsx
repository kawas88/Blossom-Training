'use client'

import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

export function ThankYou() {
  return (
    <div className="px-4 md:px-6 py-16 md:py-24 flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sage/15"
        >
          <Heart className="h-10 w-10 fill-sage text-sage" strokeWidth={1.5} />
        </motion.div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
          Thank you, <span className="italic-sage">truly.</span>
        </h1>
        <p className="mt-4 text-ink/70 text-balance">
          Your honest reflections will help us shape the way we use the ASQ-3 across our nurseries. You can close this tab now.
        </p>
      </motion.div>
    </div>
  )
}
