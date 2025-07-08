'use client'

import { motion } from 'framer-motion'

export default function PageHeader() {
  return (
    <>
      <motion.h1
        className="text-3xl font-bold text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Ink Battles
      </motion.h1>
      <motion.p
        className="text-center text-gray-500 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        基于 AI 的作品分析工具，为您的创作提供深度洞察与评分。
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        <p className="text-xs text-gray-500 text-center">
          本分析报告由AI生成，仅供参考。灵感来源
          iykrzu，测试量表由三角之外设计，站点由 Q78KG 设计并编写。
        </p>
        <p className="text-xs text-gray-500 text-center">
          我们将严格保护您的隐私，并仅将您的数据用于提供本服务。
        </p>
        <p className="text-xs text-gray-500 text-center">
          您在使用本服务即视为同意将相关数据提供给为本服务提供支持的第三方服务商，以便其提供本服务。我们不对第三方服务商的行为负责。
        </p>
        <p className="text-xs text-gray-500 text-center">
          站点代码基于 MIT 许可证开源{' '}
          <a
            href="https://github.com/Hoshino-Yumetsuki/ink-battles"
            style={{ color: 'blue' }}
          >
            点击前往
          </a>
        </p>
      </motion.div>
    </>
  )
}
