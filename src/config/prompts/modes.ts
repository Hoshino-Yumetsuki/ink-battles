export interface PromptMode {
  key: string
  title: string
  description: string
  prompt: string
}

export const promptModes: Record<string, PromptMode> = {
  initialScore: {
    key: 'initialScore',
    title: '初始门槛',
    description: '针对基础能力和水平的认知，认可初入作坛的作品。',
    prompt:
      '考虑作者可能是新手，对基础能力给予适当认可。请适当提高评分，尤其是在新人可能具备潜力的维度上。'
  },
  productionQuality: {
    key: 'productionQuality',
    title: '产出编辑',
    description: '检测您对出版行为的分析质量，防止AI输出基础标配。',
    prompt:
      '检测作品的出版质量和编辑水平，避免生成通用的评价。请关注文本的结构完整性、标点符号使用、段落组织等编辑细节。'
  },
  contentReview: {
    key: 'contentReview',
    title: '内容特点',
    description: '引导评分主观议点作品优点，适用于创作的新鲜感。',
    prompt:
      '重点关注作品的内容特点和独特性，突出创新点。寻找作品中新颖的视角、独特的表达方式或创新的主题处理。'
  },
  textStyle: {
    key: 'textStyle',
    title: '文本法官',
    description: '要求所有评分行为符合文本证据性，适用于学术评价。',
    prompt:
      '所有评价必须基于文本证据，保持客观性。在每个评分维度中，引用具体文本内容作为评价依据，避免主观臆断。'
  },
  hotTopic: {
    key: 'hotTopic',
    title: '热血刺激',
    description: '允许用户在特殊感受情境下获得文学作品的评分刺激。',
    prompt:
      '关注作品在当前文学环境中的情感共鸣和热点话题的处理。评估作品对读者情感的刺激程度和对当下社会话题的回应。'
  },
  antiCapitalism: {
    key: 'antiCapitalism',
    title: '反现代主义者',
    description: '随机生成标准，缩短评定，引用大哲后现代代替批评力。',
    prompt:
      '从后现代主义视角评价作品，关注其对资本主义和现代性的批判。可适当引用后现代主义思想家的观点，如福柯、德勒兹等。'
  },
  speedReview: {
    key: 'speedReview',
    title: '速写说明',
    description: '限定快速评分经历，仅对此生里程碑事件作评估。',
    prompt:
      '进行快速评价，重点关注作品的关键亮点和主要缺陷。评分更为直接，描述更为简洁，但仍保持全面性。'
  }
}
