'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Camera,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  User
} from 'lucide-react'
import AnimatedBackground from '@/components/common/animated-background'
import { UserProvider, useUser } from '@/components/providers/user-context'
import { compressImage } from '@/utils/image-compressor'

function HomeGridIcon() {
  return (
    <div className="w-4 h-4 bg-white rounded-sm grid grid-cols-2 gap-0.5">
      <div className="bg-transparent border border-black w-full h-full"></div>
      <div className="bg-transparent border border-black w-full h-full"></div>
      <div className="bg-transparent border border-black w-full h-full"></div>
      <div className="bg-transparent border border-black w-full h-full"></div>
    </div>
  )
}

function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, setUser } = useUser()
  const [avatarLoading, setAvatarLoading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const dashboardBackground = process.env.NEXT_PUBLIC_DASHBOARD_BACKGROUND

  const isActive = useCallback(
    (href: string) => {
      if (href === '/dashboard') {
        return pathname === '/dashboard'
      }
      return pathname?.startsWith(href)
    },
    [pathname]
  )

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.replace('/login')
      return
    }

    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  const handleLogout = useCallback(async () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('username')
    localStorage.removeItem('user_password')

    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout request failed', error)
    } finally {
      window.location.href = '/'
    }
  }, [])

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
          router.replace('/login')
          return
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
    [router, setUser]
  )

  const navItems = [
    { title: '概览', href: '/dashboard', icon: LayoutDashboard },
    { title: '历史', href: '/dashboard/history', icon: FileText },
    { title: '设置', href: '/dashboard/settings', icon: Settings }
  ]

  return (
    <div className="h-screen w-full relative p-0 md:p-4 flex flex-col md:flex-row gap-0 md:gap-4 overflow-hidden font-sans bg-zinc-100 dark:bg-zinc-950">
      <div className="absolute inset-0 z-0">
        {dashboardBackground ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${dashboardBackground}')` }}
            />
            <div className="absolute inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-xl" />
          </>
        ) : (
          <AnimatedBackground />
        )}
      </div>

      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 15,
          delay: 0.1
        }}
        className="hidden md:flex flex-col items-center justify-between z-20 transition-all duration-300 bg-black text-white shadow-2xl h-full w-20 rounded-2xl py-8 shrink-0"
      >
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
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.title}
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${active ? 'bg-white/30' : 'bg-white/20 hover:bg-white/30'}`}
              >
                <Icon className="w-5 h-5 text-white" />
              </Link>
            )
          })}
        </nav>

        <Link
          href="/"
          title="返回首页"
          className="mt-auto p-3 hover:bg-white/10 rounded-full cursor-pointer transition-colors"
        >
          <HomeGridIcon />
        </Link>
      </motion.aside>

      <motion.div
        initial={{ y: 20, opacity: 0, x: '-50%' }}
        animate={{ y: 0, opacity: 1, x: '-50%' }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 15,
          delay: 0.2
        }}
        className="md:hidden fixed bottom-6 left-1/2 z-50 flex items-center justify-between gap-2 px-2 py-2 bg-black/90 backdrop-blur-md text-white rounded-full shadow-2xl w-[90%] max-w-sm border border-white/10"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex items-center justify-center py-3 rounded-full transition-colors ${active ? 'bg-white/30' : 'bg-white/20 hover:bg-white/30'}`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          )
        })}

        <div className="w-px h-6 bg-white/20"></div>

        <Link
          href="/"
          className="flex-1 flex items-center justify-center py-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <HomeGridIcon />
        </Link>
      </motion.div>

      <motion.main
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 15
        }}
        className="flex-1 bg-white dark:bg-zinc-800/80 rounded-none md:rounded-2xl px-4 pt-4 pb-24 md:pb-8 md:px-8 md:pt-6 overflow-hidden shadow-2xl relative h-full flex flex-col backdrop-blur-3xl border-x-0 md:border border-white/50 dark:border-white/10"
      >
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
          <div className="flex justify-between items-start mb-6 shrink-0">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-white shadow-lg overflow-hidden relative group">
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

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/45 text-white flex items-center justify-center"
                  disabled={avatarLoading}
                  aria-label="上传头像"
                >
                  {avatarLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
              </div>

              <input
                ref={avatarInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={avatarLoading}
              />
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button
                type="button"
                className="bg-black/80 backdrop-blur-md text-white rounded-full px-3 py-1 md:px-6 md:py-2 flex items-center gap-2 shadow-lg cursor-pointer hover:bg-black transition-colors"
                onClick={() => router.push('/dashboard/settings')}
              >
                <User className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium hidden md:inline">
                  {user?.username || '设置'}
                </span>
                <span className="text-xs md:hidden inline">
                  {user ? '' : '设置'}
                </span>
              </button>

              <div className="flex items-center gap-1 md:gap-3 ml-1 md:ml-2">
                <button
                  type="button"
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg"
                  onClick={() => router.push('/dashboard/settings')}
                  aria-label="设置"
                >
                  <Settings className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  type="button"
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg"
                  onClick={handleLogout}
                  aria-label="退出登录"
                >
                  <LogOut className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto pr-1">{children}</div>
        </div>
      </motion.main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <DashboardShell>{children}</DashboardShell>
    </UserProvider>
  )
}
