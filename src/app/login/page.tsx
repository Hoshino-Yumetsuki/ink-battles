'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Turnstile from 'react-turnstile'
import { Button } from '@/components/ui/button'
import { useFingerprint } from '@/hooks/use-fingerprint'
import { AuthLayout } from '@/components/layout/auth-layout'
import { User, Lock } from 'lucide-react'

const isTurnstileEnabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED !== 'false'

export default function LoginPage() {
  const router = useRouter()
  const _fingerprint = useFingerprint()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('请填写所有字段')
      return
    }

    if (isTurnstileEnabled && !turnstileToken) {
      setError('请完成人机验证')
      return
    }

    // if (!fingerprint) {
    //   setError('浏览器指纹获取失败，请刷新页面重试');
    //   return;
    // }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '登录失败')
      }

      // 保存token和用户信息
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('username', data.user.username)
      localStorage.setItem('user_password', password) // 用于解密

      // Dispatch event to notify other components to update auth state
      window.dispatchEvent(new Event('auth-change'))

      // 跳转到dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Ink Battles">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          欢迎回来
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          登录您的账户以继续
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 dark:text-white border border-transparent dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-colors"
              placeholder="请输入您的用户名"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 dark:text-white border border-transparent dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-colors"
              placeholder="请输入您的密码"
              disabled={loading}
            />
          </div>
        </div>

        {isTurnstileEnabled && (
          <div className="flex justify-center bg-gray-50 dark:bg-zinc-800 p-2 rounded-lg border border-gray-100 dark:border-zinc-700">
            <Turnstile
              sitekey={
                process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
                '1x00000000000000000000AA'
              }
              onVerify={(token) => setTurnstileToken(token)}
              theme="auto"
            />
          </div>
        )}

        <div className="flex gap-4 pt-2">
          <Link href="/register" className="flex-1">
            <Button
              type="button"
              className="w-full py-6 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-none text-base font-normal shadow-none"
              disabled={loading}
            >
              注册
            </Button>
          </Link>
          <Button
            type="submit"
            className="flex-1 py-6 bg-blue-500 hover:bg-blue-600 text-white text-base font-normal shadow-md shadow-blue-500/20"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}
