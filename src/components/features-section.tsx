'use client'

import { motion } from 'framer-motion'
import { BrainCircuit, ShieldCheck, BarChart3, FileText } from 'lucide-react'

const features = [
  {
    icon: BrainCircuit,
    title: 'AI 深度驱动',
    description: '采用先进的大语言模型，深入理解文本内涵与风格。'
  },
  {
    icon: BarChart3,
    title: '多维评分体系',
    description: '从剧情、文笔、人设等多个维度进行专业量化评估。'
  },
  {
    icon: FileText,
    title: '全面格式支持',
    description: '支持纯文本、TXT、Word 文档及图片内容识别分析。'
  },
  {
    icon: ShieldCheck,
    title: '隐私安全保护',
    description: '您的作品仅用于分析，我们严格保护您的创作隐私。'
  }
]

export default function FeaturesSection() {
  return (
    <section className="py-12 mt-8 border-t border-border/50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="flex flex-col items-center text-center p-4 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
              <feature.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
