'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Turnstile from 'react-turnstile'
import { Button } from '@/components/ui/button'
import { useFingerprint } from '@/hooks/use-fingerprint'
import { AuthLayout } from '@/components/layout/auth-layout'
import { User, Lock, KeyRound } from 'lucide-react'

const isTurnstileEnabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED !== 'false'

export default function RegisterPage() {
  const router = useRouter()
  const _fingerprint = useFingerprint()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证表单
    if (!username || !password || !confirmPassword) {
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
          password
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
        <h2 className="text-3xl font-bold text-gray-900">创建账户</h2>
        <p className="mt-2 text-gray-500">开启您的旅程</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              placeholder="请输入用户名"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              placeholder="请输入密码（至少8位）"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyRound className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              placeholder="请再次输入密码"
              disabled={loading}
            />
          </div>
        </div>

        {isTurnstileEnabled && (
          <div className="flex justify-center bg-gray-50 p-2 rounded-lg border border-gray-100">
            <Turnstile
              sitekey={
                process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
                '1x00000000000000000000AA'
              }
              onVerify={(token) => setTurnstileToken(token)}
              theme="light"
            />
          </div>
        )}

        <div className="flex gap-4 pt-2">
          <Link href="/login" className="flex-1">
            <Button
              type="button"
              className="w-full py-6 bg-blue-50 text-blue-600 hover:bg-blue-100 border-none text-base font-normal shadow-none"
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
