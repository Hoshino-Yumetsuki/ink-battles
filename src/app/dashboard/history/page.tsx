'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import WriterScoreResult from '@/components/features/analysis/score-result'
import type { WriterAnalysisResult } from '@/app/page'
import { decrypt } from '@/utils/crypto'

interface AnalysisHistory {
  id: string
  result?: WriterAnalysisResult | null
  error?: string
  mode: string
  createdAt: string
}

interface HistoryResponse {
  success?: boolean
  histories?: Array<{
    id: string
    encryptedResult?: string
    mode: string
    createdAt: string
  }>
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

function HistoryListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-2">
            <div className="animate-pulse bg-muted rounded-md h-4 w-2/5" />
            <div className="animate-pulse bg-muted rounded-md h-3 w-1/3" />
            <div className="animate-pulse bg-muted rounded-md h-3 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function DashboardHistoryPage() {
  const [histories, setHistories] = useState<AnalysisHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedHistory, setSelectedHistory] =
    useState<AnalysisHistory | null>(null)

  const fetchHistory = useCallback(async (pageNum: number) => {
    const token = localStorage.getItem('auth_token')
    const password = localStorage.getItem('user_password')

    if (!token) {
      setHistories([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(
        `/api/dashboard/history?page=${pageNum}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('获取历史记录失败')
      }

      const data: HistoryResponse = await response.json()
      const rawHistories = data.histories || []

      const decryptedHistories = await Promise.all(
        rawHistories.map(async (item) => {
          try {
            if (!password || !item.encryptedResult) {
              return {
                id: item.id,
                mode: item.mode,
                createdAt: item.createdAt,
                error: !password ? '缺少本地密码，无法解密' : undefined,
                result: null
              }
            }

            const decrypted = await decrypt(item.encryptedResult, password)
            return {
              id: item.id,
              mode: item.mode,
              createdAt: item.createdAt,
              result: JSON.parse(decrypted) as WriterAnalysisResult
            }
          } catch (error) {
            console.error('Failed to decrypt history item', item.id, error)
            return {
              id: item.id,
              mode: item.mode,
              createdAt: item.createdAt,
              error: '解密失败',
              result: null
            }
          }
        })
      )

      setHistories(decryptedHistories)
      setTotalPages(data.pagination?.totalPages || 1)
      setPage(data.pagination?.page || pageNum)
    } catch (error) {
      console.error('Fetch history failed', error)
      setHistories([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory(page)
  }, [fetchHistory, page])

  const pageNumbers = useMemo(() => {
    const maxVisible = 5
    const start = Math.max(1, page - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    const adjustedStart = Math.max(1, end - maxVisible + 1)

    return Array.from(
      { length: end - adjustedStart + 1 },
      (_, index) => adjustedStart + index
    )
  }, [page, totalPages])

  return (
    <>
      <motion.div
        key="history"
        initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-6"
      >
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">分析历史</h2>

          {loading ? (
            <HistoryListSkeleton />
          ) : histories.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              暂无分析记录
            </p>
          ) : (
            <div className="flex flex-col">
              <div className="space-y-4">
                {histories.map((history, index) => (
                  <motion.div
                    key={history.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-4">
                      <div className="flex justify-between items-start mb-2 gap-4">
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
                              {history.result.overallScore}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              分数
                            </p>
                          </div>
                        )}
                      </div>

                      {history.error ? (
                        <p className="text-sm text-red-600">{history.error}</p>
                      ) : null}
                    </Card>
                  </motion.div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="shrink-0 flex items-center justify-center gap-2 md:gap-4 pt-4 mt-4 border-t flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    上一页
                  </Button>

                  <div className="flex items-center gap-2">
                    {pageNumbers.map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
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
      </motion.div>

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
    </>
  )
}
