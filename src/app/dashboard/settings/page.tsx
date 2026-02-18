'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChangeEmailForm } from '@/components/features/settings/change-email-form'
import { ChangePasswordForm } from '@/components/features/settings/change-password-form'
import { DeleteAccountForm } from '@/components/features/settings/delete-account-form'
import { Camera, User } from 'lucide-react'
import { compressImage } from '@/utils/image-compressor'
import { useUser } from '@/components/providers/user-context'

export default function DashboardSettingsPage() {
  const { user, refreshUser, setUser } = useUser()
  const [avatarLoading, setAvatarLoading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setAvatarLoading(true)
      try {
        const { file: compressedFile } = await compressImage(file, {
          targetSize: 50 * 1024,
          initialQuality: 80,
          minQuality: 40
        })

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(compressedFile)
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('读取头像文件失败'))
        })

        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('登录已过期')
        }

        const response = await fetch('/api/auth/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ avatar: base64 })
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || '上传失败')
        }

        setUser((prev) => (prev ? { ...prev, avatar: base64 } : prev))
      } catch (error) {
        console.error('Avatar upload failed', error)
        alert('头像上传失败，请重试')
      } finally {
        setAvatarLoading(false)
        event.target.value = ''
      }
    },
    [setUser]
  )

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
      transition={{
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1]
      }}
      className="space-y-6"
    >
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">账户信息</h2>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pt-2">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-gray-200 dark:bg-gray-800 dark:border-gray-700 relative">
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.username || 'Avatar'}
                  fill
                  className="object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
              disabled={avatarLoading}
              aria-label="上传头像"
            >
              <Camera className="w-6 h-6" />
            </button>

            <input
              ref={avatarInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={avatarLoading}
            />

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
              <p className="text-sm text-muted-foreground">注册时间</p>
              <p className="font-medium">
                {user?.createdAt &&
                  new Date(user.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">上次登录</p>
              <p className="font-medium">
                {user?.lastLoginAt &&
                  new Date(user.lastLoginAt).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">账户安全设置</h2>
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-100 mb-6">
            <TabsTrigger value="email">邮箱设置</TabsTrigger>
            <TabsTrigger value="password">修改密码</TabsTrigger>
            <TabsTrigger
              value="danger"
              className="text-red-500 data-[state=active]:text-red-600 data-[state=active]:bg-red-50 dark:data-[state=active]:bg-red-950/20"
            >
              注销账户
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  {user?.email ? (
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        已绑定邮箱:
                      </span>
                      <span>{user.email}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      尚未绑定邮箱
                    </span>
                  )}
                </p>
              </div>

              <ChangeEmailForm
                hasEmail={!!user?.email}
                onSuccess={() => {
                  refreshUser()
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="password">
            <ChangePasswordForm onSuccess={() => {}} />
          </TabsContent>

          <TabsContent value="danger">
            <DeleteAccountForm />
          </TabsContent>
        </Tabs>
      </Card>
    </motion.div>
  )
}
