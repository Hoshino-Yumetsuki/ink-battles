'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react'

import type React from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'cap-widget': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >
    }
  }
}

declare global {
  interface Window {
    CAP_CUSTOM_FETCH?: typeof fetch
    CAP_CUSTOM_WASM_URL?: string
  }
}

interface CapWidgetProps
  extends Omit<React.ComponentProps<'div'>, 'onError' | 'onProgress'> {
  endpoint: string
  workerCount?: number
  override?: {
    wasmUrl?: string
    customFetch?: typeof fetch
  }
  locale?: {
    initial?: string
    verifying?: string
    solved?: string
    error?: string
    wasmDisabled?: string
    verifyingAria?: string
    solvedAria?: string
    errorAria?: string
  }
  onSolve?: (token: string) => void
  onError?: (message: string) => void
  onReset?: () => void
  onProgress?: (progress: number) => void
}

interface CapWidgetRef {
  reset: () => void
}

const CapWidget = forwardRef<CapWidgetRef, CapWidgetProps>(
  (
    {
      endpoint,
      workerCount,
      override,
      locale,
      onSolve,
      onError,
      onReset,
      onProgress,
      style,
      ...props
    },
    ref
  ) => {
    const { wasmUrl, customFetch } = override ?? {}

    const [loading, setLoading] = useState(true)
    const [widgetKey, setWidgetKey] = useState(0)
    const widgetRef = useRef<HTMLElement>(null)

    useImperativeHandle(ref, () => ({
      reset: () => {
        // 通过改变 key 强制重新渲染 widget
        setWidgetKey((prev) => prev + 1)
        onReset?.()
      }
    }))

    const handleSolve = useCallback(
      (e: Event) => {
        console.log('handleSolve', e)
        const customEvent = e as CustomEvent<{ token?: string }>
        const token = customEvent.detail?.token
        if (!token) return
        onSolve?.(token)
      },
      [onSolve]
    )

    const handleError = useCallback(
      (e: Event) => {
        const customEvent = e as CustomEvent<{ message?: string }>
        const message = customEvent.detail?.message
        if (!message) return
        onError?.(message)
      },
      [onError]
    )

    const handleReset = useCallback(() => {
      onReset?.()
    }, [onReset])

    const handleProgress = useCallback(
      (e: Event) => {
        const customEvent = e as CustomEvent<{ progress?: number }>
        const progress = customEvent.detail?.progress ?? 0
        onProgress?.(progress)
      },
      [onProgress]
    )

    useEffect(() => {
      let mounted = true

      const loadWidget = async () => {
        await import('@cap.js/widget')

        if (mounted) {
          setLoading(false)
        }
      }

      // 只在客户端执行
      if (typeof window !== 'undefined') {
        loadWidget()
      }

      return () => {
        mounted = false
      }
    }, [])

    useEffect(() => {
      if (loading) return
      window.CAP_CUSTOM_FETCH = customFetch
      window.CAP_CUSTOM_WASM_URL = wasmUrl
      const widget = widgetRef.current
      if (widget) {
        widget.addEventListener('solve', handleSolve)
        widget.addEventListener('error', handleError)
        widget.addEventListener('progress', handleProgress)
        widget.addEventListener('reset', handleReset)
      }
      return () => {
        window.CAP_CUSTOM_FETCH = undefined
        window.CAP_CUSTOM_WASM_URL = undefined
        if (widget) {
          widget.removeEventListener('solve', handleSolve)
          widget.removeEventListener('error', handleError)
          widget.removeEventListener('progress', handleProgress)
          widget.removeEventListener('reset', handleReset)
        }
      }
    }, [
      loading,
      wasmUrl,
      customFetch,
      handleReset,
      handleProgress,
      handleError,
      handleSolve
    ])

    if (loading) return null

    return (
      <div
        style={
          {
            '--cap-background': 'var(--background)',
            '--cap-border-color': 'var(--border)',
            '--cap-border-radius': '14px',
            '--cap-color': 'var(--foreground)',
            '--cap-checkbox-border': '1px solid var(--ring)',
            '--cap-checkbox-background': 'var(--secondary)',
            '--cap-spinner-color': 'var(--primary)',
            '--cap-spinner-background-color': 'var(--primary-foreground)',
            ...style
          } as React.CSSProperties
        }
        {...props}
      >
        <cap-widget
          key={widgetKey}
          ref={widgetRef}
          data-cap-api-endpoint={endpoint}
          data-cap-worker-count={workerCount}
          data-cap-i18n-verifying-label={locale?.verifying}
          data-cap-i18n-initial-state={locale?.initial}
          data-cap-i18n-solved-label={locale?.solved}
          data-cap-i18n-error-label={locale?.error}
          data-cap-i18n-verify-aria-label={locale?.verifyingAria}
          data-cap-i18n-verifying-aria-label={locale?.verifyingAria}
          data-cap-i18n-verified-aria-label={locale?.solvedAria}
          data-cap-i18n-error-aria-label={locale?.errorAria}
        />
      </div>
    )
  }
)

CapWidget.displayName = 'CapWidget'

export { CapWidget }
export type { CapWidgetRef }
