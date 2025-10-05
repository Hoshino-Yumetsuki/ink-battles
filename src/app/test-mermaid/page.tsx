'use client'

import WriterScoreResult from '@/components/score-result'
import type { WriterAnalysisResult } from '@/app/page'

export default function TestMermaidPage() {
  const testResult: WriterAnalysisResult = {
    overallScore: 4.2,
    overallAssessment: '这是一部优秀的作品，具有清晰的结构和引人入胜的情节。',
    title: '🌟 优秀作品',
    ratingTag: '✨ 结构清晰 / 情节流畅',
    dimensions: [
      {
        name: '🎭 人物塑造力',
        score: 4.0,
        description: '人物形象鲜明，性格立体'
      },
      {
        name: '🧠 结构复杂度',
        score: 4.5,
        description: '结构设计精巧，层次分明'
      },
      {
        name: '🔀 情节反转密度',
        score: 3.8,
        description: '情节发展合理，有适度反转'
      }
    ],
    strengths: [
      '结构设计清晰，使用多线叙事手法',
      '人物关系网络复杂而有序',
      '情节推进节奏把控得当'
    ],
    improvements: ['可以增加更多的情节反转', '某些次要人物可以更加丰满'],
    comment: '作品整体质量上乘，展现了作者对叙事结构的深刻理解。',
    structural_analysis: [
      '作品采用了经典的三幕剧结构，同时融入了双线叙事的技巧。整体结构可以用以下流程图来表示：',
      '```mermaid\ngraph TD\n    A[第一幕：设定] --> B[引入冲突]\n    B --> C[第二幕：对抗]\n    C --> D[情节发展]\n    D --> E[高潮点]\n    E --> F[第三幕：解决]\n    F --> G[结局]\n    \n    style A fill:#e1f5ff\n    style C fill:#fff4e1\n    style F fill:#ffe1e1\n```',
      '从结构图可以看出，作品遵循了经典的戏剧理论，同时在每个幕次中都有明确的转折点。',
      '人物关系方面，作品构建了一个复杂的人物网络：',
      'graph LR\n    主角 --> 导师\n    主角 --> 对手\n    主角 --> 盟友\n    对手 --> 幕后黑手\n    盟友 --> 关键人物\n    导师 -.-> 关键人物\n    \n    style 主角 fill:#ffcccc\n    style 对手 fill:#ccccff\n    style 导师 fill:#ccffcc',
      '这种人物关系的设计不仅增强了故事的复杂性，也为情节的推进提供了多种可能性。',
      '时间线方面，作品采用了非线性叙事，但总体保持了清晰的逻辑：',
      'sequenceDiagram\n    participant 现在线\n    participant 回忆线\n    participant 未来线\n    \n    现在线->>回忆线: 触发回忆\n    回忆线-->>现在线: 揭示真相\n    现在线->>未来线: 预示结局\n    未来线-->>现在线: 形成对比',
      '总体来说，作品的结构设计体现了作者对叙事艺术的深刻理解和娴熟运用。'
    ]
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Mermaid 图表功能测试</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          本页面展示了在作品结构分析中使用 Mermaid 图表的效果。
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          在 structural_analysis 字段中，系统会自动识别 Mermaid 代码（以
          graph、flowchart、sequenceDiagram 等关键词开头，或者用 ```mermaid
          代码块包裹），并将其渲染为可视化图表。
        </p>
      </div>

      <WriterScoreResult result={testResult} />
    </div>
  )
}
