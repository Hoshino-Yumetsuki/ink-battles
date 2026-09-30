"use client"

import { motion } from "framer-motion"

const backgroundImage = "/G13s14MbIAADlgb.jpg"

export default function AnimatedBackground() {
  return (
    <motion.div
      className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center"
      style={{ backgroundImage: `url("${backgroundImage}")` }}
      animate={{ opacity: [0.35, 0.5, 0.35] }}
      transition={{
        duration: 10,
        repeat: Infinity,
        repeatType: "reverse"
      }}
    />
  )
}
