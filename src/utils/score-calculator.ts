interface DimensionScore {
  name: string
  score: number
  description: string
}

const DIMENSION_WEIGHTS: Record<string, number> = {
  '🎭 人物塑造力': 1.2,
  '🧠 结构复杂度': 1.0,
  '🔀 情节反转密度': 0.9,
  '💔 情感穿透力': 1.1,
  '🎨 文体魅力': 1.0,
  '🌀 先锋性/实验性': 0.8,
  '😂 幽默感/自嘲力': 0.7,
  '🌍 主题深度': 1.2,
  '🏺 文化底蕴性': 1.0,
  '🛠️ 作者产出速度': 0.6,
  '📚 引用张力（互文性）': 0.8,
  '🪤 谜团操控力与读者诱导性': 0.9,
  '🧷 稳定性/完成度': 1.0,
  '🧬 语言原创性': 1.1,
  '👑 经典性': 1.2,
  '🧑‍🚀 新锐性': 0.9
}

export function calculateOverallScore(
  dimensions: DimensionScore[] | Record<string, any>
): number {
  if (!dimensions) {
    return 0
  }

  const baseScore = 60
  let score = baseScore

  if (!Array.isArray(dimensions)) {
    Object.entries(dimensions).forEach(([_, value]) => {
      if (typeof value === 'object' && value !== null) {
        const dimensionScore = typeof value.score === 'number' ? value.score : 0
        score += dimensionScore
      }
    })
    return Number(score.toFixed(1))
  }

  if (dimensions.length === 0) {
    return 0
  }

  dimensions.forEach((dimension) => {
    if (
      dimension &&
      typeof dimension === 'object' &&
      typeof dimension.name === 'string' &&
      typeof dimension.score === 'number'
    ) {
      const weight = DIMENSION_WEIGHTS[dimension.name] || 1.0
      score += dimension.score * weight
    }
  })

  return Number(score.toFixed(1))
}

export function generateTitleByScore(score: number): string {
  if (score >= 100) return '🏆 国际大师'
  if (score >= 95) return '🌟 文学泽芸家'
  if (score >= 90) return '👑 文协级名家'
  if (score >= 85) return '✨ 资深作家'
  if (score >= 80) return '💫 优秀作家'
  if (score >= 75) return '🔥 热门写手'
  if (score >= 70) return '📝 可靠创作者'
  if (score >= 65) return '🌈 有潜力创作者'
  if (score >= 60) return '🌱 写作新锐'
  if (score >= 55) return '📚 习作作者'
  if (score >= 50) return '🏫 写作学徒'
  return '🌱 写作新人'
}

export function generateRatingTag(score: number): string {
  if (score >= 100) return '🎯 天才之作 / 经典级作品'
  if (score >= 95) return '🔮 非凡之作 / 现象级作品'
  if (score >= 90) return '🚀 🔥 市场热门 / 惩眼新秀'
  if (score >= 85) return '💎 优秀作品'
  if (score >= 80) return '🌟 好作品 / 值得一读'
  if (score >= 75) return '📈 不错之作 / 引人入胜'
  if (score >= 70) return '🌊 有潜力 / 有亮点'
  if (score >= 65) return '🌄 及格之作 / 需要打磨'
  if (score >= 60) return '🌩️ 粗糙之作 / 需要改进'
  if (score >= 50) return '🥱 平庸之作 / 初级模仿者'
  return '🐣 入门级作品 / 需要学习'
}
