'use client'

import { motion } from 'framer-motion'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

interface ContentInputCardProps {
  content: string
  setContentAction: (content: string) => void
  isLoading: boolean
  onAnalyzeAction: () => void
}

export default function ContentInputCard({
  content,
  setContentAction,
  isLoading,
  onAnalyzeAction
}: ContentInputCardProps) {
  return (
    <Card className="h-auto">
      <CardHeader>
        <CardTitle>作品输入</CardTitle>
        <CardDescription>
          请粘贴您要分析的作品内容，支持小说、散文、诗歌等多种文体
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="请在此处粘贴您的作品全文..."
          className="min-h-[400px] resize-none"
          value={content}
          onChange={(e) => setContentAction(e.target.value)}
          disabled={isLoading}
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          字数统计: {content.length} 字
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onAnalyzeAction}
            disabled={isLoading || !content.trim()}
            className="relative overflow-hidden"
          >
            {isLoading ? (
              <span className="flex items-center">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                  className="inline-block mr-2"
                >
                  ⟳
                </motion.span>
                分析中...
              </span>
            ) : (
              <>
                <span>开始分析</span>
                <motion.span
                  className="absolute inset-0 bg-white/10"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />
              </>
            )}
          </Button>
        </motion.div>
      </CardFooter>
    </Card>
  )
}
