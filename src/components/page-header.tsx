'use client'

import { motion } from 'framer-motion'
import { AlertCircle, Sparkles, Link as LinkIcon } from 'lucide-react'

export default function PageHeader() {
  return (
    <div className="relative py-8 mb-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-20 left-1/3 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl opacity-30" />
      </div>

      <motion.div
        className="flex flex-col items-center justify-center text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Sparkles className="w-3 h-3" />
          <span>AI 驱动的文学创作助手</span>
        </motion.div>

        <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white">
          Ink Battles
        </h1>

        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          基于先进 AI
          模型的作品分析工具，为您的创作提供深度洞察、评分与改进建议。
        </p>

        {/* 友链 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50 shadow-sm"
        >
          <LinkIcon className="w-3 h-3" />
          <span>友链:</span>
          <a
            href="https://ink-battles.rikki.top/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 transition-colors font-medium hover:underline underline-offset-4"
          >
            iykrzu 的作家战力分析
          </a>
        </motion.div>

        {/* 公告栏 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-3xl mx-auto mt-6"
        >
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 flex items-start gap-3 text-left shadow-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-amber-900 dark:text-amber-200 text-xs">
                关于分析报告的说明
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                本分析报告完全由 AI
                生成，仅供参考。评分标准基于通用文学理论，但可能无法完全覆盖所有创作风格。
                请将此作为辅助工具，而非唯一的评判标准。
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
