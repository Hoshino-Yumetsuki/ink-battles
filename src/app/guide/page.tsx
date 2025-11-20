'use client'

import { motion } from 'framer-motion'
import HowItWorks from '@/components/how-it-works'
import FAQSection from '@/components/faq-section'

export default function GuidePage() {
  return (
    <div className="min-h-screen w-full">
      <div className="bg-muted/30 py-12 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            使用指南 & 常见问题
          </motion.h1>
          <motion.p
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            了解如何使用 Ink Battles 获得最佳的作品分析体验，以及常见疑问解答。
          </motion.p>
        </div>
      </div>

      <HowItWorks />

      <div className="py-8">
        <FAQSection />
      </div>
    </div>
  )
}
