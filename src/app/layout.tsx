import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import Navbar from '@/components/navbar'
import { ApiSecurityProvider } from '@/security/provider'
import { ThemeProvider } from '@/components/theme-provider'
import ErrorBoundary from '@/components/error-boundary'

export const metadata: Metadata = {
  title: 'Ink Battles',
  description: '基于 AI 的作品分析工具，为您的创作提供深度洞察'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={GeistSans.className}>
      <body
        className={`${GeistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <ApiSecurityProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
            </ApiSecurityProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
