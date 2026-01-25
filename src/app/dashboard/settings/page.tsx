'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChangeEmailForm } from '@/components/features/settings/change-email-form'
import { ChangePasswordForm } from '@/components/features/settings/change-password-form'
import { DeleteAccountForm } from '@/components/features/settings/delete-account-form'
import { User, Shield, AlertCircle } from 'lucide-react'

interface UserInfo {
  email?: string
  // ... other fields
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            账户安全设置
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            管理您的登录凭证和安全选项
          </p>
        </div>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="email">邮箱设置</TabsTrigger>
            <TabsTrigger value="password">修改密码</TabsTrigger>
            <TabsTrigger
              value="danger"
              className="data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400"
            >
              注销账户
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-6">
            <Card className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">邮箱管理</h2>
                  {user?.email ? (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> 已绑定: {user.email}
                    </p>
                  ) : (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{' '}
                      未绑定邮箱，请尽快绑定以保障账户安全
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t pt-6 dark:border-zinc-800">
                <ChangeEmailForm
                  hasEmail={!!user?.email}
                  onSuccess={() => fetchUser()}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="password" className="mt-6">
            <Card className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">登录密码</h2>
                  <p className="text-sm text-gray-500">
                    定期更换密码可以保护您的账户安全
                  </p>
                </div>
              </div>

              {!user?.email ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-md flex gap-2 items-center">
                  <AlertCircle className="w-5 h-5" />
                  <span>为保障安全，修改密码前请先绑定邮箱。</span>
                </div>
              ) : (
                <div className="border-t pt-6 dark:border-zinc-800">
                  <ChangePasswordForm onSuccess={() => {}} />
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="danger" className="mt-6">
            <DeleteAccountForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
