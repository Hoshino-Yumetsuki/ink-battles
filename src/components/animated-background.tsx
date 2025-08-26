'use client'

import { motion } from 'framer-motion'

export default function AnimatedBackground() {
  return (
    <motion.div
      className="fixed inset-0 -z-10 pointer-events-none bg-linear-to-br from-background/20 via-background to-background/80 dark:from-background dark:via-background/80 dark:to-background/40"
      animate={{
        opacity: [0.8, 0.95, 0.8]
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        repeatType: 'reverse'
      }}
    />
  )
}
