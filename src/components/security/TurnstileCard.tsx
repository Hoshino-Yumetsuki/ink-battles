'use client'

import { useState, useEffect } from 'react'
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

  const isTurnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE === 'true'

  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token)
    setIsVerified(true)
    onVerificationChangeAction(true, token)
  }

  const handleTurnstileError = (_error: string) => {
    setTurnstileToken(null)
    setIsVerified(false)
    onVerificationChangeAction(false, null)

    setTimeout(() => {
      setTurnstileKey((prev) => prev + 1)
    }, 1000)
  }

  const handleTurnstileExpire = () => {
    setTurnstileToken(null)
    setIsVerified(false)
    onVerificationChangeAction(false, null)
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
