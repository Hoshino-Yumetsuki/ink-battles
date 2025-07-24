import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

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
  const optionLabels: {
    [key: string]: { title: string; description: string }
  } = {
    initialScore: {
      title: '初始门槛',
      description: '针对基础能力和水平的认知，认可初入作坛的作品。'
    },
    productionQuality: {
      title: '产出编辑',
      description: '检测您对出版行为的分析质量，防止AI输出基础标配。'
    },
    contentReview: {
      title: '内容特点',
      description: '引导评分主观议点作品优点，适用于创作的新鲜感。'
    },
    textStyle: {
      title: '文本法官',
      description: '要求所有评分行为符合文本证据性，适用于学术评价。'
    },
    hotTopic: {
      title: '热血刺激',
      description: '允许用户在特殊感受情境下获得作品的评分刺激。'
    },
    antiCapitalism: {
      title: '反现代主义者',
      description: '随机生成标准，缩短评定，引用大哲后现代代替批评力。'
    },
    speedReview: {
      title: '速写说明',
      description: '限定快速评分经历，仅对此生里程碑事件作评估。'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>评分模式（可选）</CardTitle>
        <CardDescription>
          自由选择合适的评分角度，不同模式代表不同的评判标准
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(options).map(([key, isEnabled]) => (
          <div
            key={key}
            className="flex items-center justify-between space-y-2"
          >
            <div className="flex flex-col">
              <Label htmlFor={key} className="text-sm font-medium">
                {optionLabels[key]?.title || key}
              </Label>
              <p className="text-xs text-gray-500">
                {optionLabels[key]?.description || ''}
              </p>
            </div>
            <Switch
              id={key}
              checked={isEnabled}
              onCheckedChange={(checked) => onChange(key, checked)}
              disabled={disabled}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
