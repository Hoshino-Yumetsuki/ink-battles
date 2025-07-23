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
  '📚 引用张力（互文性）': 0.8,
  '🪤 谜团操控力与读者诱导性': 0.9,
  '🧷 稳定性/完成度': 1.0,
  '🧬 语言原创性': 1.1,
  '👑 经典性': 1.2,
  '🧑‍🚀 新锐性': 0.9
}

const OPTIONAL_DIMENSIONS = new Set([
  '😂 幽默感/自嘲力',
  '📚 引用张力（互文性）',
  '🪤 谜团操控力与读者诱导性',
  '🔀 情节反转密度'
])

const SCORE_CONFIG = {
  MIN_SCORE: 0,
  MIN_BASE_SCORE: 15,
  MAX_BASE_SCORE: 110,
  EXCELLENCE_THRESHOLD: 4,
  SYNERGY_FACTOR: 0.6,
  BALANCE_BONUS: 0.8,
  BREAKTHROUGH_THRESHOLD: 85,
  MAX_REASONABLE_SCORE: 120
}

const SYNERGY_GROUPS: Record<string, string[]> = {
  创作核心: ['🎭 人物塑造力', '🧠 结构复杂度', '💔 情感穿透力'],
  情感表达: ['💔 情感穿透力', '🎨 文体魅力', '😂 幽默感/自嘲力'],
  深度内涵: ['🌍 主题深度', '🏺 文化底蕴性', '📚 引用张力（互文性）'],
  创新实验: ['🌀 先锋性/实验性', '🧬 语言原创性', '🧑‍🚀 新锐性'],
  完成品质: ['🧷 稳定性/完成度', '🎨 文体魅力', '🧬 语言原创性'],
  经典价值: ['👑 经典性', '🌍 主题深度', '🏺 文化底蕴性'],
  叙事技巧: ['🔀 情节反转密度', '🪤 谜团操控力与读者诱导性', '🧠 结构复杂度']
}

export function calculateOverallScore(
  dimensions: DimensionScore[] | Record<string, any>
): number {
  if (!dimensions) {
    return SCORE_CONFIG.MIN_SCORE
  }

  if (!Array.isArray(dimensions)) {
    const dimensionArray: DimensionScore[] = []
    Object.entries(dimensions).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const dimensionScore = typeof value.score === 'number' ? value.score : 0
        dimensionArray.push({
          name: key,
          score: dimensionScore,
          description: value.description || ''
        })
      }
    })
    return calculateComplexScore(dimensionArray)
  }

  if (dimensions.length === 0) {
    return SCORE_CONFIG.MIN_SCORE
  }

  return calculateComplexScore(dimensions)
}

function calculateComplexScore(dimensions: DimensionScore[]): number {
  const validDimensions = filterValidDimensions(dimensions)

  if (validDimensions.length === 0) {
    return SCORE_CONFIG.MIN_SCORE
  }

  const baseScore = calculateBaseScore(validDimensions)

  const synergyBonus = calculateSynergyBonus(validDimensions)

  const excellenceBonus = calculateExcellenceBonus(validDimensions)

  const balanceAdjustment = calculateBalanceAdjustment(validDimensions)

  const qualityPenalty = calculateQualityPenalty(validDimensions)

  let totalScore =
    baseScore +
    synergyBonus +
    excellenceBonus +
    balanceAdjustment +
    qualityPenalty

  if (totalScore > SCORE_CONFIG.BREAKTHROUGH_THRESHOLD) {
    totalScore = applyBreakthroughConstraint(totalScore, validDimensions)
  }

  totalScore = Math.min(totalScore, SCORE_CONFIG.MAX_REASONABLE_SCORE)
  totalScore = Math.max(totalScore, SCORE_CONFIG.MIN_SCORE)

  return Number(totalScore.toFixed(1))
}

function filterValidDimensions(dimensions: DimensionScore[]): DimensionScore[] {
  return dimensions.filter(
    (dimension) =>
      dimension &&
      typeof dimension === 'object' &&
      typeof dimension.name === 'string' &&
      typeof dimension.score === 'number' &&
      !Number.isNaN(dimension.score) &&
      dimension.score >= 0
  )
}

function calculateBaseScore(dimensions: DimensionScore[]): number {
  let weightedSum = 0
  let totalWeight = 0
  let corePresent = 0
  let optionalPresent = 0

  let totalQualityScore = 0
  let dimensionCount = 0

  dimensions.forEach((dimension) => {
    const weight = DIMENSION_WEIGHTS[dimension.name] || 1.0
    const isOptional = OPTIONAL_DIMENSIONS.has(dimension.name)

    totalQualityScore += dimension.score
    dimensionCount++

    const baseScore = dimension.score
    let scaledScore: number

    if (baseScore >= 4.0) {
      scaledScore = 18 + (baseScore - 4.0) * 8
    } else if (baseScore >= 3.5) {
      scaledScore = 14 + (baseScore - 3.5) * 8
    } else if (baseScore >= 2.5) {
      scaledScore = 9 + (baseScore - 2.5) * 5
    } else {
      scaledScore = Math.log(Math.max(1, baseScore) + 1) * 5
    }

    const cappedScore = Math.min(28, scaledScore)

    let adjustedWeight = weight
    if (isOptional && dimension.score > 0) {
      adjustedWeight *= 1.1
      optionalPresent++
    } else if (!isOptional) {
      corePresent++
    }

    weightedSum += cappedScore * adjustedWeight
    totalWeight += adjustedWeight
  })

  const averageScore = weightedSum / totalWeight

  const avgQuality = totalQualityScore / dimensionCount
  const qualityRatio = Math.max(0, Math.min(1, (avgQuality - 1) / 3.5))
  const dynamicBaseScore =
    SCORE_CONFIG.MIN_BASE_SCORE +
    (SCORE_CONFIG.MAX_BASE_SCORE - SCORE_CONFIG.MIN_BASE_SCORE) * qualityRatio

  const coreRatio = corePresent / (dimensions.length - optionalPresent + 0.1)
  const baseMultiplier = Math.min(2.0, 1.0 + coreRatio * 1.0)

  return dynamicBaseScore + averageScore * baseMultiplier * 1.5
}

function calculateSynergyBonus(dimensions: DimensionScore[]): number {
  let totalSynergy = 0
  const dimensionMap = new Map<string, number>()

  dimensions.forEach((dim) => {
    dimensionMap.set(dim.name, dim.score)
  })

  Object.entries(SYNERGY_GROUPS).forEach(([_groupName, dimensionNames]) => {
    const groupScores = dimensionNames
      .map((name) => dimensionMap.get(name) || 0)
      .filter((score) => score > 0)

    const totalDimensionsInGroup = dimensionNames.length
    const optionalCount = dimensionNames.filter((name) =>
      OPTIONAL_DIMENSIONS.has(name)
    ).length
    const requiredForSynergy = Math.max(
      2,
      Math.ceil((totalDimensionsInGroup - optionalCount) * 0.6)
    )

    if (groupScores.length >= requiredForSynergy) {
      const geometricMean =
        groupScores.reduce((acc, score) => acc * Math.max(1, score), 1) **
        (1 / groupScores.length)

      const participationRatio = groupScores.length / totalDimensionsInGroup
      const synergyMultiplier = 0.7 + participationRatio * 0.3

      if (geometricMean > 6) {
        const synergyContribution =
          (geometricMean - 6) *
          SCORE_CONFIG.SYNERGY_FACTOR *
          groupScores.length *
          synergyMultiplier
        totalSynergy += synergyContribution
      }
    }
  })

  return Math.min(totalSynergy, 12)
}

function calculateExcellenceBonus(dimensions: DimensionScore[]): number {
  const excellentDimensions = dimensions.filter(
    (dim) => dim.score >= SCORE_CONFIG.EXCELLENCE_THRESHOLD
  )

  if (excellentDimensions.length < 3) {
    return 0
  }

  const excellenceCount = excellentDimensions.length
  const avgExcellenceScore =
    excellentDimensions.reduce((sum, dim) => sum + dim.score, 0) /
    excellenceCount

  const bonus =
    (excellenceCount / dimensions.length) ** 1.5 *
    (avgExcellenceScore - SCORE_CONFIG.EXCELLENCE_THRESHOLD) *
    2

  return Math.min(bonus, 15)
}
function calculateBalanceAdjustment(dimensions: DimensionScore[]): number {
  const coreScores = dimensions
    .filter((dim) => !OPTIONAL_DIMENSIONS.has(dim.name))
    .map((dim) => dim.score)
  const optionalScores = dimensions
    .filter((dim) => OPTIONAL_DIMENSIONS.has(dim.name) && dim.score > 0)
    .map((dim) => dim.score)

  if (coreScores.length < 4) {
    return -8
  }

  const coreMean =
    coreScores.reduce((sum, score) => sum + score, 0) / coreScores.length
  const coreVariance =
    coreScores.reduce((sum, score) => sum + (score - coreMean) ** 2, 0) /
    coreScores.length
  const coreStdDev = Math.sqrt(coreVariance)

  const coreBalanceBonus = Math.max(
    0,
    (3 - coreStdDev) * SCORE_CONFIG.BALANCE_BONUS * coreMean * 0.12
  )

  const optionalBonus =
    optionalScores.length > 0 ? Math.min(2, optionalScores.length * 0.8) : 0

  const maxCoreScore = Math.max(...coreScores)
  const minCoreScore = Math.min(...coreScores)
  const extremeGap = maxCoreScore - minCoreScore
  const extremePenalty = extremeGap > 8 ? -(extremeGap - 8) * 0.3 : 0

  const totalAdjustment = coreBalanceBonus + optionalBonus + extremePenalty
  return Math.max(-8, Math.min(totalAdjustment, 8))
}

function calculateQualityPenalty(dimensions: DimensionScore[]): number {
  const avgScore =
    dimensions.reduce((sum, dim) => sum + dim.score, 0) / dimensions.length

  const highScoreDimensions = dimensions.filter(
    (dim) => dim.score >= 4.0
  ).length
  const excellentDimensions = dimensions.filter(
    (dim) => dim.score >= 4.5
  ).length

  const veryLowScoreDimensions = dimensions.filter(
    (dim) => dim.score <= 1.5
  ).length
  const veryLowScoreRatio = veryLowScoreDimensions / dimensions.length

  const lowScoreDimensions = dimensions.filter((dim) => dim.score <= 2.5).length
  const lowScoreRatio = lowScoreDimensions / dimensions.length

  let penaltyReduction = 0
  if (highScoreDimensions >= 4) {
    penaltyReduction = 0.8
  } else if (highScoreDimensions >= 2) {
    penaltyReduction = 0.5
  } else if (excellentDimensions >= 1) {
    penaltyReduction = 0.3
  }

  let basePenalty = 0
  if (avgScore <= 1.2 && veryLowScoreRatio >= 0.9) {
    basePenalty = -15
  } else if (avgScore <= 1.5 && veryLowScoreRatio >= 0.8) {
    basePenalty = -8
  } else if (avgScore <= 2.0 && lowScoreRatio >= 0.8) {
    basePenalty = -4
  } else if (avgScore <= 2.5 && lowScoreRatio >= 0.6) {
    basePenalty = -1
  }

  return basePenalty * (1 - penaltyReduction)
}

function applyBreakthroughConstraint(
  score: number,
  dimensions: DimensionScore[]
): number {
  const highScoreDimensions = dimensions.filter((dim) => dim.score >= 4).length
  const veryHighScoreDimensions = dimensions.filter(
    (dim) => dim.score >= 4.5
  ).length
  const excellentDimensions = dimensions.filter((dim) => dim.score >= 5).length

  if (highScoreDimensions >= 8 || excellentDimensions >= 2) {
    const excess = score - SCORE_CONFIG.BREAKTHROUGH_THRESHOLD
    return SCORE_CONFIG.BREAKTHROUGH_THRESHOLD + excess * 1.5
  } else if (highScoreDimensions >= 6 || veryHighScoreDimensions >= 2) {
    const excess = score - SCORE_CONFIG.BREAKTHROUGH_THRESHOLD
    return SCORE_CONFIG.BREAKTHROUGH_THRESHOLD + excess * 1.3
  } else if (highScoreDimensions >= 4) {
    const excess = score - SCORE_CONFIG.BREAKTHROUGH_THRESHOLD
    return SCORE_CONFIG.BREAKTHROUGH_THRESHOLD + excess * 1.1
  } else {
    return Math.min(score, SCORE_CONFIG.BREAKTHROUGH_THRESHOLD)
  }
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
