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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  AnimatedTabsContent
} from '@/components/ui/tabs'
import FileUploader from './file-uploader'

interface ContentInputCardProps {
  content: string
  setContentAction: (content: string) => void
  setFileDataUrlAction: (url: string | null) => void
  setFileMetaAction?: (
    meta: { name: string; type: string; size: number } | null
  ) => void
  isLoading: boolean
  onAnalyzeAction: () => void
  analysisType: 'text' | 'file'
  setAnalysisTypeAction: (type: 'text' | 'file') => void
}

export default function ContentInputCard({
  content,
  setContentAction,
  setFileDataUrlAction,
  setFileMetaAction,
  isLoading,
  onAnalyzeAction,
  analysisType,
  setAnalysisTypeAction
}: ContentInputCardProps) {
  return (
    <Card className="h-auto">
      <CardHeader>
        <CardTitle>作品输入</CardTitle>
        <CardDescription>
          请输入要分析的内容，支持文本或文件/图片
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="text"
          value={analysisType}
          onValueChange={(value) =>
            setAnalysisTypeAction(value as 'text' | 'file')
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="text">文本输入</TabsTrigger>
            <TabsTrigger value="file">文本/图片上传</TabsTrigger>
          </TabsList>

          <AnimatedTabsContent
            value="text"
            activeValue={analysisType}
            className="mt-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <Textarea
                placeholder="请在此处粘贴您的作品全文..."
                className="min-h-[400px] resize-none transition-all duration-300"
                value={content}
                onChange={(e) => setContentAction(e.target.value)}
                disabled={isLoading}
              />
              <motion.div
                className="text-sm text-gray-500 dark:text-gray-400 mt-2"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.2 }}
              >
                字数统计: {content.length} 字
              </motion.div>
            </motion.div>
          </AnimatedTabsContent>

          <AnimatedTabsContent
            value="file"
            activeValue={analysisType}
            className="mt-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <FileUploader
                setFileDataUrlAction={setFileDataUrlAction}
                setFileMetaAction={setFileMetaAction}
                isLoading={isLoading}
                onAnalyzeAction={onAnalyzeAction}
                setContentAction={setContentAction}
              />
            </motion.div>
          </AnimatedTabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end">
        {analysisType === 'text' && (
          <motion.div
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
            }}
            whileTap={{
              scale: 0.98,
              transition: { duration: 0.1 }
            }}
          >
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
                      duration: 1.2,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                    className="inline-block mr-2"
                  >
                    ⟳
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    分析中...
                  </motion.span>
                </span>
              ) : (
                <>
                  <motion.span
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.2 }}
                  >
                    开始分析
                  </motion.span>
                  <motion.span
                    className="absolute inset-0 bg-white/10"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                  />
                </>
              )}
            </Button>
          </motion.div>
        )}
      </CardFooter>
    </Card>
  )
}
