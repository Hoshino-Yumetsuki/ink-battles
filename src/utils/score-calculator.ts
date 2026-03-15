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
  MIN_BASE_SCORE: 20,
  MAX_BASE_SCORE: 85,
  EXCELLENCE_THRESHOLD: 4.0,
  SYNERGY_FACTOR: 0.7,
  BALANCE_BONUS: 1.0,
  BREAKTHROUGH_THRESHOLD: 95,
  CONSISTENCY_THRESHOLD: 0.7,
  RELIABILITY_THRESHOLD: 0.8,
  OBJECTIVITY_WEIGHT: 0.15,
  VARIANCE_PENALTY_FACTOR: 0.08,
  CONFIDENCE_BOOST_FACTOR: 0.07
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

  return Math.min(totalSynergy, 8)
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
    (excellenceCount / dimensions.length) ** 1.3 *
    (avgExcellenceScore - SCORE_CONFIG.EXCELLENCE_THRESHOLD) *
    2.2

  return Math.min(bonus, 10)
}
function calculateBalanceAdjustment(dimensions: DimensionScore[]): number {
  const coreScores = dimensions
    .filter((dim) => !OPTIONAL_DIMENSIONS.has(dim.name))
    .map((dim) => dim.score)
  const optionalScores = dimensions
    .filter((dim) => OPTIONAL_DIMENSIONS.has(dim.name) && dim.score > 0)
    .map((dim) => dim.score)

  if (coreScores.length < 4) {
    return -4
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
  return Math.max(-6, Math.min(totalAdjustment, 8))
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
    penaltyReduction = 0.85
  } else if (highScoreDimensions >= 2) {
    penaltyReduction = 0.6
  } else if (excellentDimensions >= 1) {
    penaltyReduction = 0.4
  }

  let basePenalty = 0
  if (avgScore <= 1.2 && veryLowScoreRatio >= 0.9) {
    basePenalty = -10
  } else if (avgScore <= 1.5 && veryLowScoreRatio >= 0.8) {
    basePenalty = -6
  } else if (avgScore <= 2.0 && lowScoreRatio >= 0.8) {
    basePenalty = -3
  } else if (avgScore <= 2.5 && lowScoreRatio >= 0.6) {
    basePenalty = -0.5
  }

  return basePenalty * (1 - penaltyReduction)
}

/**
 * 计算动态最大分数
 * 基于维度质量分布，Bayesian 加权
 *
 * 核心逻辑：
 * - 基础天花板：95分
 * - 每个4.5+维度：+1.5分
 * - 一致性奖励：+最多5分
 * - 平均分奖励：+最多4.5分
 * - 硬上限：120分
 */
function calculateDynamicMaxScore(dimensions: DimensionScore[]): number {
  const excellentCount = dimensions.filter((dim) => dim.score >= 4.5).length
  const veryGoodCount = dimensions.filter((dim) => dim.score >= 4.0).length

  const avgScore =
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length

  const variance =
    dimensions.reduce((sum, d) => sum + (d.score - avgScore) ** 2, 0) /
    dimensions.length
  const stdDev = Math.sqrt(variance)

  // 基础天花板
  let maxScore = SCORE_CONFIG.BREAKTHROUGH_THRESHOLD

  // 优秀维度奖励：每个4.5+维度提升1.5分
  maxScore += excellentCount * 1.5

  // 很好维度微调：每个4.0+维度（非4.5+）提升0.3分
  maxScore += Math.max(0, veryGoodCount - excellentCount) * 0.3

  // 一致性奖励：标准差越低，天花板越高
  // stdDev=0时最高+5分，stdDev=2时为0
  const consistencyBonus = Math.max(0, (1 - stdDev / 2) * 5)
  maxScore += consistencyBonus

  // 平均分奖励：平均分越高，天花板越高
  // avgScore=3时为0，avgScore=5时为+6分
  const avgBonus = Math.max(0, (avgScore - 3) * 3)
  maxScore += avgBonus

  // 硬上限：125分（完美作品）
  // 硬下限：95分（基准）
  return Math.max(SCORE_CONFIG.BREAKTHROUGH_THRESHOLD, Math.min(125, maxScore))
}

function applyBreakthroughConstraint(
  score: number,
  dimensions: DimensionScore[]
): number {
  // 如果分数低于突破阈值，直接返回
  if (score <= SCORE_CONFIG.BREAKTHROUGH_THRESHOLD) {
    return score
  }

  // 计算动态最大分数
  const dynamicMax = calculateDynamicMaxScore(dimensions)

  // 计算超出突破阈值的部分
  const excess = score - SCORE_CONFIG.BREAKTHROUGH_THRESHOLD

  // 根据维度质量计算增长率
  const excellentCount = dimensions.filter((dim) => dim.score >= 4.5).length
  const veryGoodCount = dimensions.filter((dim) => dim.score >= 4.0).length

  let growthRate = 0.88

  if (excellentCount >= 12) {
    growthRate = 1.0
  } else if (excellentCount >= 8) {
    growthRate = 0.98
  } else if (excellentCount >= 4) {
    growthRate = 0.95
  } else if (veryGoodCount >= 10) {
    growthRate = 0.92
  } else if (veryGoodCount >= 6) {
    growthRate = 0.9
  }

  const newScore = SCORE_CONFIG.BREAKTHROUGH_THRESHOLD + excess * growthRate
  return Math.min(newScore, dynamicMax)
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

    const cappedScore = Math.min(20, scaledScore)

    weightedSum += cappedScore * weight
    totalWeight += weight
  })

  const averageScore = weightedSum / totalWeight
  const avgQuality = totalQualityScore / dimensionCount

  const qualityRatio = Math.max(0, Math.min(1, (avgQuality - 1) / 4))
  const dynamicBaseScore =
    SCORE_CONFIG.MIN_BASE_SCORE +
    (SCORE_CONFIG.MAX_BASE_SCORE - SCORE_CONFIG.MIN_BASE_SCORE) * qualityRatio

  return dynamicBaseScore + averageScore * 1.0
}

function mapScoreNonLinear(score: number): number {
  if (score >= 4.5) {
    return 16 + (score - 4.5) * 8
  } else if (score >= 4.0) {
    return 13 + (score - 4.0) * 6
  } else if (score >= 3.0) {
    return 8 + (score - 3.0) * 5
  } else if (score >= 2.0) {
    return 4 + (score - 2.0) * 4
  } else {
    return Math.log(Math.max(0.1, score) + 1) * 3.2
  }
}

function calculateConsistencyAdjustment(
  _dimensions: DimensionScore[],
  qualityMetrics: QualityMetrics
): number {
  const consistencyScore = qualityMetrics.consistency

  if (consistencyScore >= SCORE_CONFIG.CONSISTENCY_THRESHOLD) {
    return (consistencyScore - SCORE_CONFIG.CONSISTENCY_THRESHOLD) * 9
  } else {
    return (consistencyScore - SCORE_CONFIG.CONSISTENCY_THRESHOLD) * 8
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
