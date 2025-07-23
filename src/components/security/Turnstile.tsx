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
    return null
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
          theme: 'auto',
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
