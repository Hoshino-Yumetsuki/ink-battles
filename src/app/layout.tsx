import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar'
import { ApiSecurityProvider } from '@/security/provider'
import { ThemeProvider } from '@/components/theme-provider'
import ErrorBoundary from '@/components/error-boundary'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'Ink Battles',
  description: '基于 AI 的文本分析工具，为您的创作提供深度洞察'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
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
