'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { useState, useEffect, useCallback } from 'react'

interface TurnstileComponentProps {
  onVerifyAction: (token: string) => void
  onErrorAction?: (error: string) => void
  onExpireAction?: () => void
  className?: string
}

export default function TurnstileComponent({
  onVerifyAction,
  onErrorAction,
  onExpireAction,
  className = ''
}: TurnstileComponentProps) {
  const [_isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const isTurnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE === 'true'

  const handleVerify = useCallback(
    (token: string) => {
      setIsVerified(true)
      setIsLoading(false)
      onVerifyAction(token)
    },
    [onVerifyAction]
  )

  const handleError = () => {
    setIsVerified(false)
    setIsLoading(false)
    onErrorAction?.('验证失败，请重试')
  }

  const handleExpire = () => {
    setIsVerified(false)
    onExpireAction?.()
  }

  const handleBeforeInteractive = () => {
    setIsLoading(true)
  }

  const handleAfterInteractive = () => {
    setIsLoading(false)
  }

  useEffect(() => {
    if (!isTurnstileEnabled) {
      handleVerify('turnstile-disabled')
    }
  }, [isTurnstileEnabled, handleVerify])

  if (!isTurnstileEnabled) {
    return (
      <div className={`turnstile-container ${className}`}>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 flex items-center justify-center">
            <svg
              className="w-5 h-5 mr-2 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              role="img"
              aria-label="验证已跳过图标"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            人机验证已禁用
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`turnstile-container ${className}`}>
      <Turnstile
        siteKey={
          process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
          '1x00000000000000000000AA'
        }
        onSuccess={handleVerify}
        onError={handleError}
        onExpire={handleExpire}
        onBeforeInteractive={handleBeforeInteractive}
        onAfterInteractive={handleAfterInteractive}
        options={{
          theme: 'light',
          size: 'normal',
          retry: 'auto'
        }}
      />

      {isLoading && (
        <div className="text-sm text-gray-500 mt-2">正在加载验证...</div>
      )}
    </div>
  )
}
