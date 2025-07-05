'use client'

import React, { ErrorInfo } from 'react'
import { Button } from './ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('前端渲染错误:', error, errorInfo)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
          <div className="max-w-md w-full bg-card p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-card-foreground mb-4">
              呀！出现了一点问题
            </h2>
            <div className="bg-muted p-3 rounded mb-4 overflow-auto max-h-32 text-sm">
              <p className="text-muted-foreground">
                {this.state.error?.message || '应用渲染过程中发生了错误'}
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-sm text-muted-foreground mb-2">
                您可以尝试以下操作来解决问题：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mb-4">
                <li>刷新页面</li>
                <li>清除浏览器缓存</li>
                <li>检查您的网络连接</li>
                <li>稍后再试</li>
              </ul>
              <Button
                onClick={() => window.location.reload()}
                className="w-full mb-2"
              >
                刷新页面
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/')}
                className="w-full"
              >
                返回首页
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
