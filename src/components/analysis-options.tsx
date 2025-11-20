import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/utils'
import {
  Target,
  BookOpen,
  Sparkles,
  Scale,
  Flame,
  Zap,
  Timer,
  CheckCircle2
} from 'lucide-react'
import { motion } from 'framer-motion'

interface AnalysisOptionsProps {
  options: { [key: string]: boolean }
  onChange: (key: string, value: boolean) => void
  disabled?: boolean
}

export default function AnalysisOptions({
  options,
  onChange,
  disabled = false
}: AnalysisOptionsProps) {
  const optionConfig: {
    [key: string]: {
      title: string
      description: string
      icon: React.ElementType
    }
  } = {
    initialScore: {
      title: '初始门槛',
      description: '针对基础能力和水平的认知，认可初入作坛的作品。',
      icon: Target
    },
    productionQuality: {
      title: '产出编辑',
      description: '检测您对出版行为的分析质量，防止AI输出基础标配。',
      icon: BookOpen
    },
    contentReview: {
      title: '内容特点',
      description: '引导评分主观议点作品优点，适用于创作的新鲜感。',
      icon: Sparkles
    },
    textStyle: {
      title: '文本法官',
      description: '要求所有评分行为符合文本证据性，适用于学术评价。',
      icon: Scale
    },
    hotTopic: {
      title: '热血刺激',
      description: '允许用户在特殊感受情境下获得作品的评分刺激。',
      icon: Flame
    },
    antiCapitalism: {
      title: '反现代主义者',
      description: '随机生成标准，缩短评定，引用大哲后现代代替批评力。',
      icon: Zap
    },
    speedReview: {
      title: '速写说明',
      description: '限定快速评分经历，仅对此生里程碑事件作评估。',
      icon: Timer
    }
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-xl">评分模式</CardTitle>
        <CardDescription>选择合适的评分角度，定制您的分析报告</CardDescription>
      </CardHeader>
      <CardContent className="px-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(optionConfig).map(([key, config]) => {
          const isEnabled = options[key]
          const Icon = config.icon

          return (
            <motion.div
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-pressed={isEnabled}
                onClick={() => !disabled && onChange(key, !isEnabled)}
                onKeyDown={(e) => {
                  if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onChange(key, !isEnabled)
                  }
                }}
                className={cn(
                  'relative flex flex-col p-4 h-full rounded-xl border-2 cursor-pointer transition-all duration-200',
                  isEnabled
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-muted hover:border-primary/50 bg-card hover:bg-accent/50',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isEnabled
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  {isEnabled && (
                    <CheckCircle2 className="text-primary h-5 w-5" />
                  )}
                </div>

                <Label className="text-base font-semibold mb-1 cursor-pointer">
                  {config.title}
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {config.description}
                </p>
              </div>
            </motion.div>
          )
        })}
      </CardContent>
    </Card>
  )
}
