'use client'

import { motion } from 'framer-motion'
import { PenLine, Sliders, Sparkles, ArrowRight } from 'lucide-react'

const steps = [
  {
    icon: PenLine,
    title: '1. 输入作品',
    description:
      '直接粘贴文本，或上传 TXT、Word 文档及图片。支持长篇小说片段或短篇故事。'
  },
  {
    icon: Sliders,
    title: '2. 选择模式',
    description:
      '根据需要开启“毒舌模式”、“出版建议”或“深度解析”等多种评分视角。'
  },
  {
    icon: Sparkles,
    title: '3. 获取报告',
    description:
      'AI 将从剧情、人设、节奏等维度进行深度拆解，生成详细的评分报告与改进建议。'
  }
]

export default function HowItWorks() {
  return (
    <section className="py-16 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">使用流程</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            简单三步，即可获得专业的作品深度分析报告
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* 连接线 (仅在大屏显示) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-linear-to-r from-transparent via-border to-transparent -z-10" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="flex flex-col items-center text-center relative"
            >
              <div className="w-24 h-24 rounded-full bg-background border-4 border-muted flex items-center justify-center mb-6 shadow-sm relative z-10">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <step.icon className="w-8 h-8" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm border-4 border-background">
                  {index + 1}
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed px-4">
                {step.description}
              </p>

              {/* 移动端箭头 */}
              {index < steps.length - 1 && (
                <div className="md:hidden my-6 text-muted-foreground/30">
                  <ArrowRight className="w-8 h-8 rotate-90" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
