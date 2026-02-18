'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Clock,
  ExternalLink,
  FileText,
  Github,
  Heart,
  TrendingUp,
  Zap
} from 'lucide-react'
import { useUser } from '@/components/providers/user-context'

interface DashboardStats {
  totalCount: number
  averageScore: number
}

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={index}
          className="p-3 flex flex-col items-center justify-center gap-2 h-full"
        >
          <div className="animate-pulse bg-muted rounded-full h-8 w-8" />
          <div className="space-y-2 w-full flex flex-col items-center">
            <div className="animate-pulse bg-muted rounded-md h-3 w-16" />
            <div className="animate-pulse bg-muted rounded-md h-6 w-12" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function DashboardOverviewPage() {
  const { user } = useUser()
  const [timeLeft, setTimeLeft] = useState('--:--')
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalCount: 0,
    averageScore: 0
  })

  useEffect(() => {
    const token = localStorage.getItem('auth_token')

    if (!token) {
      setStatsLoading(false)
      return
    }

    let active = true
    const fetchStats = async () => {
      try {
        setStatsLoading(true)
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!response.ok) {
          return
        }

        const data: { success?: boolean; stats?: DashboardStats } =
          await response.json()
        if (active && data.stats) {
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Fetch dashboard stats failed', error)
      } finally {
        if (active) {
          setStatsLoading(false)
        }
      }
    }

    fetchStats()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const updateTimer = () => {
      if (!user?.usage?.resetTime) {
        setTimeLeft('--:--')
        return
      }

      let diff = new Date(user.usage.resetTime).getTime() - Date.now()
      if (diff < 0) diff = 0

      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setTimeLeft(`${h}h ${m}m`)
    }

    updateTimer()
    const timer = setInterval(updateTimer, 60_000)
    return () => clearInterval(timer)
  }, [user?.usage?.resetTime])

  const accountAgeDays = useMemo(() => {
    if (!user?.createdAt) return 0
    return Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
  }, [user?.createdAt])

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col min-h-full gap-4"
    >
      <Card className="p-4 shrink-0">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              当前使用状态
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">
                刷新倒计时
              </span>
              <span className="text-sm font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {timeLeft}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                已用次数
              </span>
              <span className="text-2xl font-bold">
                {user?.usage?.used || 0}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                剩余可用
              </span>
              <span className="text-2xl font-bold">
                {(user?.usage?.limit || 0) - (user?.usage?.used || 0)}
              </span>
            </div>
          </div>

          <div className="mb-3">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-black dark:bg-white rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(((user?.usage?.used || 0) / (user?.usage?.limit || 1)) * 100, 100)}%`
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              总额度: {user?.usage?.limit || 10} 次/天
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t mt-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5"
              asChild
            >
              <a
                href="https://github.com/Hoshino-Yumetsuki/ink-battles"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-3.5 h-3.5" />
                GitHub
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5"
              asChild
            >
              <a href="/guide">
                <ExternalLink className="w-3.5 h-3.5" />
                指南
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:hover:bg-pink-900/20"
              asChild
            >
              <a
                href="https://afdian.com/a/q78kg"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Heart className="w-3.5 h-3.5" />
                支持
              </a>
            </Button>
          </div>
        </div>
      </Card>

      {statsLoading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
          <Card className="p-3 flex flex-col items-center justify-center gap-1.5 text-center h-full">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">总分析次数</p>
              <p className="text-lg font-bold">{stats.totalCount}</p>
            </div>
          </Card>

          <Card className="p-3 flex flex-col items-center justify-center gap-1.5 text-center h-full">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">平均分数</p>
              <p className="text-lg font-bold">{stats.averageScore}</p>
            </div>
          </Card>

          <Card className="p-3 flex flex-col items-center justify-center gap-1.5 text-center h-full">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">账户年龄</p>
              <p className="text-lg font-bold">{accountAgeDays}天</p>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-4 flex-1 flex flex-col justify-center">
        <h2 className="text-base font-bold mb-2">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button asChild className="h-full text-base">
            <Link href="/">新建分析</Link>
          </Button>
          <Button asChild variant="outline" className="h-full text-base">
            <Link href="/dashboard/history">查看历史记录</Link>
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
