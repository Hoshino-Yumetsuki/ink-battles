'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeSwitcher } from '@/components/common/theme-switcher'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { useId, useState, useEffect } from 'react'
import { User, LogOut, LayoutDashboard } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(null)
  const logoTitleId = useId()

  const navItems = [
    { label: '首页', path: '/' },
    { label: '使用指南', path: '/guide' }
  ]

  useEffect(() => {
    // 检查登录状态
    const checkLoginStatus = async () => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        setIsLoggedIn(true)
        // 获取用户信息以显示头像
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const data = await res.json()
            if (data.user?.avatar) {
              setAvatar(data.user.avatar)
            }
          }
        } catch (error) {
          console.error('Failed to fetch user info', error)
        }
      } else {
        setIsLoggedIn(false)
        setAvatar(null)
      }
    }

    checkLoginStatus()
    // 监听 storage 和 auth-change 事件以响应登录/登出变化
    window.addEventListener('storage', checkLoginStatus)
    window.addEventListener('auth-change', checkLoginStatus)

    return () => {
      window.removeEventListener('storage', checkLoginStatus)
      window.removeEventListener('auth-change', checkLoginStatus)
    }
  }, []) // 依赖 pathname 变化来重新检查登录状态

  const handleLogout = async () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('username')
    localStorage.removeItem('user_password')
    await fetch('/api/auth/logout', { method: 'POST' })

    // 直接刷新页面以更新状态
    window.location.href = '/'
  }

  useMotionValueEvent(scrollY, 'change', (latest) => {
    // Dashboard 页面不隐藏
    if (pathname?.startsWith('/dashboard')) {
      return
    }

    // 向下滚动超过10px时隐藏，向上滚动时显示
    if (latest > lastScrollY && latest > 80) {
      setHidden(true)
    } else {
      setHidden(false)
    }

    setLastScrollY(latest)
  })

  // 在登录和注册页面以及 Dashboard 页面隐藏 Navbar
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname?.startsWith('/dashboard')
  ) {
    return null
  }

  return (
    <motion.header
      className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
      variants={{
        visible: { y: 0 },
        hidden: { y: '-100%' }
      }}
      animate={hidden ? 'hidden' : 'visible'}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-600"
            role="img"
            aria-labelledby={logoTitleId}
          >
            <title id={logoTitleId}>Ink Battles Logo</title>
            <path d="m18 7 4 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l4-2" />
            <path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" />
            <path d="M18 22V5l-6-3-6 3v17" />
            <path d="M12 11h.01" />
            <path d="M2 9v13" />
            <path d="M22 9v13" />
          </svg>
          <span className="font-bold text-xl">Ink Battles</span>
        </div>

        <nav>
          <div className="flex items-center gap-6">
            <ul className="flex items-center gap-6">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`transition-colors hover:text-blue-600 ${
                      pathname === item.path
                        ? 'text-blue-600 font-medium'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <ThemeSwitcher />

            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full p-0 overflow-hidden"
                  >
                    {avatar ? (
                      <Image
                        src={avatar}
                        alt="User Avatar"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    控制台
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => router.push('/login')} size="sm">
                登录
              </Button>
            )}
          </div>
        </nav>
      </div>
    </motion.header>
  )
}
