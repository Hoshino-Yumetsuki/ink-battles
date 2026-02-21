'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { buildApiUrl } from '@/utils/api-url'

export function DeleteAccountForm() {
  const _router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(false)

  const handleDelete = async () => {
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (!password) {
      setError('请输入密码')
      return
    }

    if (!isConfirmed) {
      setError('请确认您已知晓注销后果')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(buildApiUrl('/api/user/delete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({ password })
      })

      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        throw new Error(data.error || '注销失败')
      }

      // 清除本地存储
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      localStorage.removeItem('username')
      localStorage.removeItem('user_password')

      // 跳转首页并刷新
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            注销账户
          </CardTitle>
          <CardDescription className="text-red-600/80 dark:text-red-400/80">
            此操作不可逆。注销后，您的所有数据（包括分析历史、设置等）将被永久删除，无法恢复。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setIsOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            申请注销账户
          </Button>
        </CardContent>
      </Card>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-red-200 dark:border-red-900">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  确认注销账户？
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-sm text-red-700 dark:text-red-300">
                <p className="font-bold mb-1">警告：此操作无法撤销！</p>
                <p>您的所有个人数据、分析记录和账号信息将立即被永久删除。</p>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="del-password">输入密码确认身份</Label>
                  <Input
                    id="del-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入您的密码"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="del-confirm-password">再次输入密码</Label>
                  <Input
                    id="del-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码以确认"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="confirm-delete"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600"
                  />
                  <label
                    htmlFor="confirm-delete"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    我已知晓后果，确认注销账户
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsOpen(false)}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={
                    loading || !password || !confirmPassword || !isConfirmed
                  }
                  onClick={handleDelete}
                >
                  {loading ? '注销中...' : '确认永久注销'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
