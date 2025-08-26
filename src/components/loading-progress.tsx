'use client'

import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

interface LoadingProgressProps {
  progress: number
}

export default function LoadingProgress({ progress }: LoadingProgressProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>分析进行中</CardTitle>
        <CardDescription>
          正在使用AI分析您的作品，这可能需要几分钟时间...
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden h-2 mb-4 bg-muted rounded-md">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-md"
            style={{ width: `${progress}%` }}
          />
          <motion.div
            className="absolute top-0 h-full w-1/3 bg-linear-to-r from-transparent via-primary/30 to-transparent"
            animate={{
              x: ['-100%', '400%']
            }}
            transition={{
              repeat: Infinity,
              duration: 2.5,
              ease: 'linear'
            }}
          />
        </div>
        <motion.p
          className="text-sm text-right font-mono text-primary/80 dark:text-primary/70"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          {progress}%
        </motion.p>
      </CardContent>
    </Card>
  )
}
