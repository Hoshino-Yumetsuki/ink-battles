interface DimensionScore {
  name: string
  score: number
  description: string
  confidence?: number
  variance?: number
}

interface QualityMetrics {
  consistency: number
  reliability: number
  objectivity: number
  completeness: number
}

interface AdvancedScoreResult {
  finalScore: number
  baseScore: number
  adjustments: Record<string, number>
  qualityMetrics: QualityMetrics
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
  MIN_BASE_SCORE: 12,
  MAX_BASE_SCORE: 95,
  EXCELLENCE_THRESHOLD: 4.0,
  SYNERGY_FACTOR: 0.5,
  BALANCE_BONUS: 0.7,
  BREAKTHROUGH_THRESHOLD: 85,
  CONSISTENCY_THRESHOLD: 0.7,
  RELIABILITY_THRESHOLD: 0.8,
  OBJECTIVITY_WEIGHT: 0.15,
  VARIANCE_PENALTY_FACTOR: 0.1,
  CONFIDENCE_BOOST_FACTOR: 0.05
}

const DYNAMIC_WEIGHT_CONFIG = {
  QUALITY_BASED_ADJUSTMENT: 0.2,
  CORRELATION_THRESHOLD: 0.6,
  ADAPTIVE_FACTOR: 0.1
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
  const result = calculateAdvancedScore(dimensions)
  return result.finalScore
}

export function calculateDetailedScore(
  dimensions: DimensionScore[] | Record<string, any>
): AdvancedScoreResult {
  return calculateAdvancedScore(dimensions)
}

export function calculateAdvancedScore(
  dimensions: DimensionScore[] | Record<string, any>
): AdvancedScoreResult {
  if (!dimensions) {
    return createEmptyResult()
  }

  let dimensionArray: DimensionScore[]
  if (!Array.isArray(dimensions)) {
    dimensionArray = []
    Object.entries(dimensions).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const dimensionScore = typeof value.score === 'number' ? value.score : 0
        dimensionArray.push({
          name: key,
          score: dimensionScore,
          description: value.description || '',
          confidence: value.confidence || 0.8,
          variance: value.variance || 0.1
        })
      }
    })
  } else {
    dimensionArray = dimensions.map((dim) => ({
      ...dim,
      confidence: dim.confidence || 0.8,
      variance: dim.variance || 0.1
    }))
  }

  if (dimensionArray.length === 0) {
    return createEmptyResult()
  }

  return calculateAdvancedComplexScore(dimensionArray)
}

function createEmptyResult(): AdvancedScoreResult {
  return {
    finalScore: SCORE_CONFIG.MIN_SCORE,
    baseScore: SCORE_CONFIG.MIN_SCORE,
    adjustments: {},
    qualityMetrics: {
      consistency: 0,
      reliability: 0,
      objectivity: 0,
      completeness: 0
    }
  }
}

function calculateAdvancedComplexScore(
  dimensions: DimensionScore[]
): AdvancedScoreResult {
  const validDimensions = filterValidDimensions(dimensions)

  if (validDimensions.length === 0) {
    return createEmptyResult()
  }

  const qualityMetrics = calculateQualityMetrics(validDimensions)

  const adjustedWeights = calculateDynamicWeights(
    validDimensions,
    qualityMetrics
  )

  const baseScore = calculateAdvancedBaseScore(validDimensions, adjustedWeights)

  const adjustments: Record<string, number> = {}

  adjustments.synergyBonus = calculateSynergyBonus(validDimensions)
  adjustments.excellenceBonus = calculateExcellenceBonus(validDimensions)
  adjustments.balanceAdjustment = calculateBalanceAdjustment(validDimensions)
  adjustments.qualityPenalty = calculateQualityPenalty(validDimensions)
  adjustments.consistencyAdjustment = calculateConsistencyAdjustment(
    validDimensions,
    qualityMetrics
  )
  adjustments.objectivityBonus = calculateObjectivityBonus(
    validDimensions,
    qualityMetrics
  )

  let totalScore =
    baseScore + Object.values(adjustments).reduce((sum, adj) => sum + adj, 0)

  if (totalScore > SCORE_CONFIG.BREAKTHROUGH_THRESHOLD) {
    totalScore = applyBreakthroughConstraint(totalScore, validDimensions)
  }

  totalScore = Math.max(totalScore, SCORE_CONFIG.MIN_SCORE)

  return {
    finalScore: Number(totalScore.toFixed(1)),
    baseScore: Number(baseScore.toFixed(1)),
    adjustments,
    qualityMetrics
  }
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

      if (geometricMean > 7) {
        const synergyContribution =
          (geometricMean - 6) *
          SCORE_CONFIG.SYNERGY_FACTOR *
          groupScores.length *
          synergyMultiplier
        totalSynergy += synergyContribution
      }
    }
  })

  return Math.min(totalSynergy, 10)
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
    (excellenceCount / dimensions.length) ** 1.4 *
    (avgExcellenceScore - SCORE_CONFIG.EXCELLENCE_THRESHOLD) *
    1.8

  return Math.min(bonus, 12)
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
    (3 - coreStdDev) * SCORE_CONFIG.BALANCE_BONUS * coreMean * 0.1
  )

  const optionalBonus =
    optionalScores.length > 0 ? Math.min(1.8, optionalScores.length * 0.6) : 0

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
    return SCORE_CONFIG.BREAKTHROUGH_THRESHOLD + excess * 0.9
  } else if (highScoreDimensions >= 6 || veryHighScoreDimensions >= 2) {
    const excess = score - SCORE_CONFIG.BREAKTHROUGH_THRESHOLD
    return SCORE_CONFIG.BREAKTHROUGH_THRESHOLD + excess * 0.8
  } else if (highScoreDimensions >= 4) {
    const excess = score - SCORE_CONFIG.BREAKTHROUGH_THRESHOLD
    return SCORE_CONFIG.BREAKTHROUGH_THRESHOLD + excess * 0.7
  } else {
    return Math.min(score, SCORE_CONFIG.BREAKTHROUGH_THRESHOLD)
  }
}

function calculateQualityMetrics(dimensions: DimensionScore[]): QualityMetrics {
  const scores = dimensions.map((d) => d.score)
  const confidences = dimensions.map((d) => d.confidence || 0.8)
  const variances = dimensions.map((d) => d.variance || 0.1)

  const scoreMean = scores.reduce((sum, s) => sum + s, 0) / scores.length
  const scoreVariance =
    scores.reduce((sum, s) => sum + (s - scoreMean) ** 2, 0) / scores.length
  const consistency =
    Math.max(0, 1 - scoreVariance / 4) * 0.7 +
    (confidences.reduce((sum, c) => sum + c, 0) / confidences.length) * 0.3

  const avgConfidence =
    confidences.reduce((sum, c) => sum + c, 0) / confidences.length
  const completenessRatio =
    dimensions.length / Object.keys(DIMENSION_WEIGHTS).length
  const reliability = avgConfidence * 0.6 + completenessRatio * 0.4

  const avgVariance =
    variances.reduce((sum, v) => sum + v, 0) / variances.length
  const scoreDistribution = calculateScoreDistribution(scores)
  const objectivity =
    Math.max(0, 1 - avgVariance) * 0.5 + scoreDistribution * 0.5

  const corePresent = dimensions.filter(
    (d) => !OPTIONAL_DIMENSIONS.has(d.name)
  ).length
  const totalCore =
    Object.keys(DIMENSION_WEIGHTS).length - OPTIONAL_DIMENSIONS.size
  const completeness =
    Math.min(1, corePresent / totalCore) * 0.8 + completenessRatio * 0.2

  return {
    consistency: Number(consistency.toFixed(3)),
    reliability: Number(reliability.toFixed(3)),
    objectivity: Number(objectivity.toFixed(3)),
    completeness: Number(completeness.toFixed(3))
  }
}

function calculateScoreDistribution(scores: number[]): number {
  const bins = [0, 1, 2, 3, 4, 5]
  const distribution = new Array(bins.length - 1).fill(0)

  scores.forEach((score) => {
    for (let i = 0; i < bins.length - 1; i++) {
      if (score >= bins[i] && score < bins[i + 1]) {
        distribution[i]++
        break
      }
    }
  })

  const total = scores.length
  let entropy = 0
  distribution.forEach((count) => {
    if (count > 0) {
      const p = count / total
      entropy -= p * Math.log2(p)
    }
  })

  const maxEntropy = Math.log2(distribution.length)
  return entropy / maxEntropy
}

function calculateDynamicWeights(
  dimensions: DimensionScore[],
  qualityMetrics: QualityMetrics
): Record<string, number> {
  const adjustedWeights: Record<string, number> = { ...DIMENSION_WEIGHTS }

  dimensions.forEach((dimension) => {
    const baseName = dimension.name
    const baseWeight = DIMENSION_WEIGHTS[baseName] || 1.0

    let qualityAdjustment = 1.0

    if (dimension.score >= 4.5) {
      qualityAdjustment += DYNAMIC_WEIGHT_CONFIG.QUALITY_BASED_ADJUSTMENT
    } else if (dimension.score <= 2.0) {
      qualityAdjustment -= DYNAMIC_WEIGHT_CONFIG.QUALITY_BASED_ADJUSTMENT * 0.5
    }

    const confidenceAdjustment = (dimension.confidence || 0.8) * 0.2 + 0.8

    const consistencyAdjustment = qualityMetrics.consistency * 0.1 + 0.9

    adjustedWeights[baseName] =
      baseWeight *
      qualityAdjustment *
      confidenceAdjustment *
      consistencyAdjustment
  })

  return adjustedWeights
}

function calculateAdvancedBaseScore(
  dimensions: DimensionScore[],
  adjustedWeights: Record<string, number>
): number {
  let weightedSum = 0
  let totalWeight = 0
  let totalQualityScore = 0
  let dimensionCount = 0

  dimensions.forEach((dimension) => {
    const weight = adjustedWeights[dimension.name] || 1.0
    const confidence = dimension.confidence || 0.8

    totalQualityScore += dimension.score
    dimensionCount++

    let scaledScore = mapScoreNonLinear(dimension.score)

    scaledScore *= 0.7 + confidence * 0.3

    const cappedScore = Math.min(24, scaledScore)

    weightedSum += cappedScore * weight
    totalWeight += weight
  })

  const averageScore = weightedSum / totalWeight
  const avgQuality = totalQualityScore / dimensionCount

  const qualityRatio = Math.max(0, Math.min(1, (avgQuality - 1) / 4))
  const dynamicBaseScore =
    SCORE_CONFIG.MIN_BASE_SCORE +
    (SCORE_CONFIG.MAX_BASE_SCORE - SCORE_CONFIG.MIN_BASE_SCORE) * qualityRatio

  return dynamicBaseScore + averageScore * 1.2
}

function mapScoreNonLinear(score: number): number {
  if (score >= 4.5) {
    return 18 + (score - 4.5) * 8
  } else if (score >= 4.0) {
    return 15 + (score - 4.0) * 6
  } else if (score >= 3.0) {
    return 9 + (score - 3.0) * 6
  } else if (score >= 2.0) {
    return 5 + (score - 2.0) * 4
  } else {
    return Math.log(Math.max(0.1, score) + 1) * 3
  }
}

function calculateConsistencyAdjustment(
  _dimensions: DimensionScore[],
  qualityMetrics: QualityMetrics
): number {
  const consistencyScore = qualityMetrics.consistency

  if (consistencyScore >= SCORE_CONFIG.CONSISTENCY_THRESHOLD) {
    return (consistencyScore - SCORE_CONFIG.CONSISTENCY_THRESHOLD) * 8
  } else {
    return (consistencyScore - SCORE_CONFIG.CONSISTENCY_THRESHOLD) * 12
  }
}

function calculateObjectivityBonus(
  _dimensions: DimensionScore[],
  qualityMetrics: QualityMetrics
): number {
  const objectivityScore = qualityMetrics.objectivity
  const reliabilityScore = qualityMetrics.reliability

  if (reliabilityScore >= SCORE_CONFIG.RELIABILITY_THRESHOLD) {
    return objectivityScore * SCORE_CONFIG.OBJECTIVITY_WEIGHT * 15
  }

  return 0
}

export function convertToLegacyFormat(
  advancedResult: AdvancedScoreResult,
  dimensions: DimensionScore[]
): {
  overallScore: number
  overallAssessment: string
  title: string
  ratingTag: string
  dimensions: { name: string; score: number; description: string }[]
  strengths: string[]
  improvements: string[]
  qualityMetrics?: QualityMetrics
  adjustments?: Record<string, number>
  recommendations?: string[]
} {
  const { finalScore, qualityMetrics, adjustments } = advancedResult

  const strengths: string[] = []
  const improvements: string[] = []

  return {
    overallScore: finalScore,
    title: generateTitleByScore(finalScore),
    ratingTag: generateRatingTag(finalScore),
    dimensions: dimensions.map((dim) => ({
      name: dim.name,
      score: dim.score,
      description: dim.description
    })),
    strengths,
    improvements,
    qualityMetrics,
    adjustments,
    overallAssessment: ''
  }
}

export function generateTitleByScore(score: number): string {
  if (score >= 100) return '🏆 国际大师'
  if (score >= 95) return '🌟 作品泽芸家'
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
