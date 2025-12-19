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
import { Type, Upload, Sparkles, Loader2 } from 'lucide-react'

interface ContentInputCardProps {
  content: string
  setContentAction: (content: string) => void
  setFileAction: (file: File | null) => void
  file: File | null
  previewUrl: string | null
  isLoading: boolean
  onAnalyzeAction: () => void
  analysisType: 'text' | 'file'
  setAnalysisTypeAction: (type: 'text' | 'file') => void
  setUploadedTextAction: (content: string) => void
}

export default function ContentInputCard({
  content,
  setContentAction,
  setFileAction,
  file,
  previewUrl,
  isLoading,
  onAnalyzeAction,
  analysisType,
  setAnalysisTypeAction,
  setUploadedTextAction
}: ContentInputCardProps) {
  return (
    <Card className="h-full flex flex-col border-none shadow-lg bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Sparkles className="w-6 h-6 text-primary" />
          作品输入
        </CardTitle>
        <CardDescription>
          请输入要分析的内容，支持直接粘贴文本或上传文件/图片
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <Tabs
          defaultValue="text"
          value={analysisType}
          onValueChange={(value) =>
            setAnalysisTypeAction(value as 'text' | 'file')
          }
          className="w-full h-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-muted/50">
            <TabsTrigger
              value="text"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Type className="w-4 h-4" />
              文本输入
            </TabsTrigger>
            <TabsTrigger
              value="file"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Upload className="w-4 h-4" />
              文件上传
            </TabsTrigger>
          </TabsList>

          <AnimatedTabsContent
            value="text"
            activeValue={analysisType}
            className="mt-0 flex-1 flex flex-col"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex-1 flex flex-col"
            >
              <Textarea
                placeholder="请在此处粘贴您的作品全文... (建议 500 字以上以获得更准确的分析)"
                className="flex-1 min-h-100 resize-none p-6 text-base leading-relaxed border-muted-foreground/20 focus-visible:ring-primary/30 transition-all duration-300 bg-background/50"
                value={content}
                onChange={(e) => setContentAction(e.target.value)}
                disabled={isLoading}
              />
              <motion.div
                className="flex justify-between items-center mt-3 px-1"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.2 }}
              >
                <span className="text-xs text-muted-foreground">
                  支持 Markdown 格式
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {content.length} 字
                </span>
              </motion.div>
            </motion.div>
          </AnimatedTabsContent>

          <AnimatedTabsContent
            value="file"
            activeValue={analysisType}
            className="mt-0 flex-1"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="h-full"
            >
              <FileUploader
                setFileAction={setFileAction}
                file={file}
                previewUrl={previewUrl}
                isLoading={isLoading}
                onAnalyzeAction={onAnalyzeAction}
                setUploadedTextAction={setUploadedTextAction}
              />
            </motion.div>
          </AnimatedTabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="pt-2 pb-6">
        {analysisType === 'text' && (
          <motion.div
            className="w-full"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Button
              onClick={onAnalyzeAction}
              disabled={isLoading || !content.trim()}
              className="w-full h-12 text-lg font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              size="lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在深入分析...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  开始分析
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </CardFooter>
    </Card>
  )
}
