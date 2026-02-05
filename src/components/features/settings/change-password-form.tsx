'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Lock, ShieldCheck } from 'lucide-react'
import { CapWidget, type CapWidgetRef } from '@/components/wed/cap-widget'

const isCaptchaEnabled = process.env.NEXT_PUBLIC_CAP_ENABLED === 'true'

interface ChangePasswordFormProps {
  onSuccess: () => void
}

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const capWidgetRef = useRef<CapWidgetRef>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [captchaToken, setCaptchaToken] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [code, setCode] = useState('')

  const handleSendCode = async () => {
    setError('')
    setSuccess('')

    if (isCaptchaEnabled && !captchaToken) {
      setError('请完成人机验证')
      return
    }

    try {
      setCountdown(60)
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          type: 'change_password',
          captchaToken
        }) // Backend uses current user email
      })
      const data = await res.json()

      if (!res.ok) {
        setCountdown(0)
        setCaptchaToken('')
        // Reset the Cap widget to allow user to solve again
        if (isCaptchaEnabled) {
          capWidgetRef.current?.reset()
        }
        throw new Error(data.error || '发送验证码失败')
      }

      setSuccess('验证码已发送至您的绑定邮箱')
      setCaptchaToken('')

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !code) {
      setError('请填写所有字段')
      return
    }
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({ newPassword, code })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '修改失败')
      }

      setSuccess('密码修改成功')
      setNewPassword('')
      setCode('')
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-md">
          {success}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="verify-code">
          验证码
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <input
              id="verify-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
              placeholder="请输入邮箱验证码"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleSendCode}
            disabled={countdown > 0}
            className="w-32"
          >
            {countdown > 0 ? `${countdown}s` : '获取验证码'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="new-password">
          新密码
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
            placeholder="至少8位字符"
          />
        </div>
      </div>

      {isCaptchaEnabled && (
        <div className="flex justify-center">
          <CapWidget
            ref={capWidgetRef}
            endpoint="/api/cap"
            onSolve={(token) => setCaptchaToken(token)}
            onError={(message) => setError(message)}
            onReset={() => setCaptchaToken('')}
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        确认修改密码
      </Button>
    </form>
  )
}
