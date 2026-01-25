'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Turnstile from 'react-turnstile'
import { Button } from '@/components/ui/button'
import { useFingerprint } from '@/hooks/use-fingerprint'
import { AuthLayout } from '@/components/layout/auth-layout'
import { User, Lock, KeyRound, Mail, ShieldCheck } from 'lucide-react'

const isTurnstileEnabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED !== 'false'

export default function RegisterPage() {
  const router = useRouter()
  const _fingerprint = useFingerprint()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleSendCode = async () => {
    if (!email) {
      setError('请输入邮箱地址')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }

    try {
      setCountdown(60)
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()

      if (!res.ok) {
        setCountdown(0)
        throw new Error(data.error || '发送失败')
      }

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      setError('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证表单
    if (!username || !email || !code || !password || !confirmPassword) {
      setError('请填写所有字段')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 8) {
      setError('密码长度至少为8个字符')
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          email,
          code,
          password,
          turnstileToken
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '注册失败')
      }

      // 保存token
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('username', data.user.username)

      // 跳转到dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Join Ink Battles">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          创建账户
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">开启您的旅程</p>
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
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 dark:text-white border border-transparent dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-colors"
              placeholder="请输入用户名"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 dark:text-white border border-transparent dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-colors"
              placeholder="请输入邮箱"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ShieldCheck className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 dark:text-white border border-transparent dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-colors"
                placeholder="请输入验证码"
                disabled={loading}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleSendCode}
              disabled={countdown > 0 || loading}
              className="w-32 py-3 h-auto"
            >
              {countdown > 0 ? `${countdown}s` : '发送'}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 dark:text-white border border-transparent dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-colors"
              placeholder="请输入密码（至少8位）"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyRound className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 dark:text-white border border-transparent dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-colors"
              placeholder="请再次输入密码"
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
          <Link href="/login" className="flex-1">
            <Button
              type="button"
              className="w-full py-6 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-none text-base font-normal shadow-none"
              disabled={loading}
            >
              登录
            </Button>
          </Link>
          <Button
            type="submit"
            className="flex-1 py-6 bg-blue-600 hover:bg-blue-700 text-white text-base font-normal shadow-md shadow-blue-500/20"
            disabled={loading}
          >
            {loading ? '注册中...' : '立即注册'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}
