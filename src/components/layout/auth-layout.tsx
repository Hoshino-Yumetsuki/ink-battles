'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  image?: string
}

export function AuthLayout({
  children,
  title = 'Ink Battles',
  image = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80'
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-black p-4 relative">
      <Link
        href="/"
        className="absolute top-8 left-8 z-50 transition-transform hover:-translate-x-1"
      >
        <Button
          variant="ghost"
          className="gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">返回首页</span>
        </Button>
      </Link>

      <div className="w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-150">
        <div className="hidden md:block w-1/2 relative bg-gray-900">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{
              backgroundImage: `url('${image}')`
            }}
          >
            <div className="absolute inset-0 bg-linear-to-br from-blue-900/60 to-purple-900/60" />
          </div>
          <div className="absolute top-8 left-8 text-white z-10 w-full pr-8">
            <h1 className="text-3xl font-medium tracking-wide">{title}</h1>
            <p className="mt-4 text-gray-200 text-lg opacity-90">
              Where creativity meets competition.
            </p>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-zinc-900 relative">
          {children}
        </div>
      </div>
    </div>
  )
}
