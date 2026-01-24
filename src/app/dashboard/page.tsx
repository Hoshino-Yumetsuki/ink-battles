'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { compressImage } from '@/utils/image-compressor'
import { decrypt } from '@/utils/client-crypto'
import {
  User,
  LogOut,
  FileText,
  Clock,
  TrendingUp,
  LayoutDashboard,
  Settings,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Github,
  Heart
} from 'lucide-react'
import AnimatedBackground from '@/components/common/animated-background'
import WriterScoreResult from '@/components/features/analysis/score-result'

interface UserInfo {
  username: string
  avatar?: string
  createdAt: string
  lastLoginAt: string
  usage?: {
    used: number
    limit: number
  }
}

interface AnalysisHistory {
  id: string
  content?: string
  result?: any
  error?: string
  mode: string
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [histories, setHistories] = useState<AnalysisHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [selectedHistory, setSelectedHistory] =
    useState<AnalysisHistory | null>(null)

  // Pagination State
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarLoading(true)
    try {
      // 压缩图片
      const { file: compressedFile } = await compressImage(file, {
        targetSize: 50 * 1024, // 50KB
        initialQuality: 80,
        minQuality: 40
      })

      // 转换为Base64
      const reader = new FileReader()
      reader.readAsDataURL(compressedFile)
      reader.onload = async () => {
        const base64 = reader.result as string

        // 上传
        const token = localStorage.getItem('auth_token')
        const res = await fetch('/api/auth/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ avatar: base64 })
        })

        if (res.ok) {
          // 更新本地状态
          setUser((prev) => (prev ? { ...prev, avatar: base64 } : null))
          // 触发 storage 事件以更新 Navbar (though Navbar fetches its own on mount/change,
          // triggering a reload might be needed or just let the user navigate)
          // We can fire a custom event or just let it be. Navbar checks on mount.
        } else {
          const data = await res.json()
          alert(data.error || '上传失败')
        }
        setAvatarLoading(false)
      }
    } catch (error) {
      console.error('Avatar upload failed', error)
      alert('头像上传失败，请重试')
      setAvatarLoading(false)
    }
  }

  const fetchHistory = useCallback(async (pageNum: number) => {
    const token = localStorage.getItem('auth_token')
    const password = localStorage.getItem('user_password')
    if (!token || !password) return

    try {
      const historyResponse = await fetch(
        `/api/dashboard/history?page=${pageNum}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        const rawHistories = historyData.histories || []

        const decryptedHistories = await Promise.all(
          rawHistories.map(async (h: any) => {
            try {
              const content = h.encryptedContent
                ? await decrypt(h.encryptedContent, password)
                : null
              const resultStr = h.encryptedResult
                ? await decrypt(h.encryptedResult, password)
                : null
              return {
                id: h.id,
                content,
                result: resultStr ? JSON.parse(resultStr) : null,
                mode: h.mode,
                createdAt: h.createdAt
              }
            } catch (e) {
              console.error('Failed to decrypt history item', h.id, e)
              return {
                id: h.id,
                error: '解密失败',
                mode: h.mode,
                createdAt: h.createdAt
              }
            }
          })
        )

        setHistories(decryptedHistories)
        if (historyData.pagination) {
          setTotalPages(historyData.pagination.totalPages)
          setTotalCount(historyData.pagination.total)
        }
      }
    } catch (error) {
      console.error('Fetch history error:', error)
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token')

      if (!token) {
        router.push('/login')
        return
      }

      // 获取用户信息
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!userResponse.ok) {
        throw new Error('获取用户信息失败')
      }

      const userData = await userResponse.json()
      setUser(userData.user)

      // 初始加载历史记录 (Page 1)
      await fetchHistory(1)
    } catch (error) {
      console.error('Load dashboard error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router, fetchHistory])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setPage(newPage)
    fetchHistory(newPage)
  }

  const handleLogout = async () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('username')
    localStorage.removeItem('user_password')
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full relative p-4 flex gap-4 overflow-hidden font-sans bg-zinc-100 dark:bg-zinc-950">
      <div className="absolute inset-0 z-0">
        <AnimatedBackground />
      </div>

      {/* 侧边栏 */}
      <aside className="w-20 bg-black text-white rounded-2xl py-8 flex flex-col items-center shadow-2xl h-full transition-all duration-300 z-10 shrink-0">
        <div className="mb-8 p-3 rounded-full bg-white/10 backdrop-blur-md">
          <svg
            className="w-6 h-6 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-label="Logo"
            role="img"
          >
            <title>Logo</title>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        <nav className="flex-1 flex flex-col gap-6 w-full items-center">
          {/* 这里可以放侧边栏图标 */}
          <button
            type="button"
            className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${activeTab === 'overview' ? 'bg-white/30' : 'bg-white/20 hover:bg-white/30'}`}
            onClick={() => setActiveTab('overview')}
          >
            <div className="w-4 h-4 bg-white rounded-sm grid grid-cols-2 gap-0.5">
              <div className="bg-transparent border border-black w-full h-full"></div>
              <div className="bg-transparent border border-black w-full h-full"></div>
              <div className="bg-transparent border border-black w-full h-full"></div>
              <div className="bg-transparent border border-black w-full h-full"></div>
            </div>
          </button>
        </nav>

        <button
          type="button"
          className="mt-auto p-3 hover:bg-white/10 rounded-full cursor-pointer transition-colors"
          onClick={() => router.push('/')}
        >
          <LayoutDashboard className="w-5 h-5 text-gray-400" />
        </button>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 bg-white dark:bg-zinc-800/80 rounded-2xl px-8 pt-6 pb-8 overflow-hidden shadow-2xl relative h-full flex flex-col backdrop-blur-3xl border border-white/50 dark:border-white/10">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
          {/* 顶部栏 - 模仿参考图 */}
          <div className="flex justify-between items-start mb-6 shrink-0">
            {/* 左侧头像区域 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden relative group cursor-pointer">
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt="User Avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* 右侧控制栏 */}
            <div className="flex items-center gap-4">
              {/* 登录/用户胶囊按钮 */}
              <button
                type="button"
                className="bg-black/80 backdrop-blur-md text-white rounded-full px-6 py-2 flex items-center gap-2 shadow-lg cursor-pointer hover:bg-black transition-colors"
                onClick={() =>
                  user ? setActiveTab('settings') : router.push('/login')
                }
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {user?.username || '登录'}
                </span>
              </button>

              {/* 窗口控制按钮模拟 */}
              <div className="flex items-center gap-3 ml-2">
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg"
                >
                  <Settings
                    className="w-5 h-5"
                    onClick={() => setActiveTab('settings')}
                  />
                </button>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 顶部使用情况卡片 */}
                <Card className="p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                       <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        当前使用状态
                       </span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="flex flex-col gap-1">
                          <span className="text-sm text-muted-foreground font-medium">已用次数</span>
                          <span className="text-4xl font-bold text-gray-900 dark:text-white">
                            {user?.usage?.used || 0}
                          </span>
                       </div>

                       <div className="flex flex-col gap-1">
                          <span className="text-sm text-muted-foreground font-medium">可用次数</span>
                          <span className="text-4xl font-bold text-gray-900 dark:text-white">
                            {(user?.usage?.limit || 0) - (user?.usage?.used || 0)}
                          </span>
                       </div>

                       <div className="flex flex-col gap-1">
                          <span className="text-sm text-muted-foreground font-medium">刷新时间</span>
                          <span className="text-xl font-semibold text-gray-700 dark:text-gray-300 mt-auto mb-1">
                            每日 00:00 (UTC)
                          </span>
                       </div>
                    </div>

                    <div className="mt-8">
                      <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(( (user?.usage?.used || 0) / (user?.usage?.limit || 1) ) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-right">
                        总额度: {user?.usage?.limit || 10} 次/天
                      </p>
                    </div>

                    {/* 底部按钮栏 */}
                    <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800">
                      <a
                        href="https://github.com/Hoshino-Yumetsuki/ink-battles"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors text-sm font-medium"
                      >
                        <Github className="w-4 h-4" />
                        GitHub 仓库
                      </a>
                      <a
                        href="#"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors text-sm font-medium"
                      >
                         <ExternalLink className="w-4 h-4" />
                         使用指南
                      </a>
                      <a
                        href="#"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors text-sm font-medium text-pink-600 dark:text-pink-400"
                      >
                         <Heart className="w-4 h-4" />
                         支持我们 (爱发电)
                      </a>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          总分析次数
                        </p>
                        <p className="text-2xl font-bold">{totalCount}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          平均分数
                        </p>
                        <p className="text-2xl font-bold">
                          {histories.length > 0
                            ? Math.round(
                                histories.reduce(
                                  (sum, h) => sum + (h.result?.score || 0),
                                  0
                                ) / histories.length
                              )
                            : 0}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          账户年龄
                        </p>
                        <p className="text-2xl font-bold">
                          {user?.createdAt &&
                            Math.floor(
                              (Date.now() -
                                new Date(user.createdAt).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}
                          天
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">快速操作</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => router.push('/')}
                      className="h-20 text-lg"
                    >
                      新建分析
                    </Button>
                    <Button
                      onClick={() => setActiveTab('history')}
                      variant="outline"
                      className="h-20 text-lg"
                    >
                      查看历史记录
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* 历史记录标签 */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">分析历史</h2>
                  {histories.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">
                      暂无分析记录
                    </p>
                  ) : (
                    <div className="flex flex-col h-[calc(100vh-280px)] min-h-100">
                      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {histories.map((history) => (
                          <Card key={history.id} className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <button
                                type="button"
                                className="flex-1 cursor-pointer text-left appearance-none bg-transparent border-0 p-0"
                                onClick={() => setSelectedHistory(history)}
                              >
                                <p className="font-medium hover:text-blue-600 transition-colors">
                                  {history.result?.title || '分析结果'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(history.createdAt).toLocaleString(
                                    'zh-CN'
                                  )}
                                </p>
                              </button>
                              {history.result && (
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-blue-600">
                                    {history.result.overallScore ||
                                      history.result.score}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    分数
                                  </p>
                                </div>
                              )}
                            </div>
                            {history.error ? (
                              <p className="text-sm text-red-600">
                                {history.error}
                              </p>
                            ) : history.content ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {history.content}
                              </p>
                            ) : null}
                          </Card>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="shrink-0 flex items-center justify-center gap-4 pt-4 mt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                          >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            上一页
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            第 {page} 页 / 共 {totalPages} 页
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= totalPages}
                          >
                            下一页
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* 设置标签 */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">账户信息</h2>
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pt-2">
                    <div className="relative group shrink-0">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                        {user?.avatar ? (
                          <Image
                            src={user.avatar}
                            alt={user.username}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <User className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                        <Camera className="w-6 h-6" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={avatarLoading}
                        />
                      </label>
                      {avatarLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-4 w-full">
                      <div>
                        <p className="text-sm text-muted-foreground">用户名</p>
                        <p className="font-medium">{user?.username}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          注册时间
                        </p>
                        <p className="font-medium">
                          {user?.createdAt &&
                            new Date(user.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          上次登录
                        </p>
                        <p className="font-medium">
                          {user?.lastLoginAt &&
                            new Date(user.lastLoginAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">安全设置</h2>
                  <div className="space-y-4">
                    <Button variant="outline" className="w-full justify-start">
                      修改密码
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      双因素认证
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 分析结果弹窗 */}
      {selectedHistory?.result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-4 border-b dark:border-zinc-800">
              <h3 className="font-bold text-lg">分析详情</h3>
              <button
                type="button"
                onClick={() => setSelectedHistory(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-black/20">
              <WriterScoreResult result={selectedHistory.result} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
