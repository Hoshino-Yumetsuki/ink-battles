'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeSwitcher } from './theme-switcher'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { useId, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const logoTitleId = useId()

  const navItems = [
    { label: '首页', path: '/' },
    { label: '使用指南', path: '/guide' }
  ]

  useMotionValueEvent(scrollY, 'change', (latest) => {
    // 向下滚动超过10px时隐藏，向上滚动时显示
    if (latest > lastScrollY && latest > 80) {
      setHidden(true)
    } else {
      setHidden(false)
    }

    setLastScrollY(latest)
  })

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
          </div>
        </nav>
      </div>
    </motion.header>
  )
}
