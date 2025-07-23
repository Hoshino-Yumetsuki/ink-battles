'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TurnstileComponent from './Turnstile'

interface TurnstileCardProps {
  onVerificationChangeAction: (
    isVerified: boolean,
    token: string | null
  ) => void
}

export default function TurnstileCard({
  onVerificationChangeAction
}: TurnstileCardProps) {
  const [_turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [_isVerified, setIsVerified] = useState<boolean>(false)
  const [turnstileKey, setTurnstileKey] = useState<number>(0)
  const turnstileRef = useRef<{ reset: () => void } | null>(null)

  const isTurnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE === 'true'

  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token)
    setIsVerified(true)
    onVerificationChangeAction(true, token)
  }

  const handleTurnstileError = (error: string) => {
    setTurnstileToken(null)
    setIsVerified(false)
    onVerificationChangeAction(false, null)
    toast.error(`验证失败: ${error}`)

    // Auto-refresh Turnstile component using Cloudflare API
    setTimeout(() => {
      if (turnstileRef.current) {
        try {
          // Use the reset method from the Turnstile component
          turnstileRef.current.reset()
        } catch (_resetError) {
          console.warn('Turnstile reset failed, using fallback key refresh')
          setTurnstileKey((prev) => prev + 1)
        }
      } else {
        // Fallback: refresh component by changing key
        setTurnstileKey((prev) => prev + 1)
      }
      toast.info('请重新进行验证')
    }, 1000)
  }

  const handleTurnstileExpire = () => {
    setTurnstileToken(null)
    setIsVerified(false)
    onVerificationChangeAction(false, null)
    toast.warning('验证已过期，请重新验证')
  }

  useEffect(() => {
    if (!isTurnstileEnabled) {
      setIsVerified(true)
      setTurnstileToken('turnstile-disabled')
      onVerificationChangeAction(true, 'turnstile-disabled')
    }
  }, [isTurnstileEnabled, onVerificationChangeAction])

  if (!isTurnstileEnabled) {
    return null
  }

  return (
    <Card className="h-auto">
      <CardHeader>
        <CardTitle>Turnstile 验证</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <TurnstileComponent
            key={turnstileKey}
            ref={turnstileRef}
            onVerifyAction={handleTurnstileVerify}
            onErrorAction={handleTurnstileError}
            onExpireAction={handleTurnstileExpire}
            className=""
          />
        </div>
      </CardContent>
    </Card>
  )
}
