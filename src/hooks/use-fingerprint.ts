'use client'

import { useEffect, useState } from 'react'
import { getFingerprint } from '@/utils/fingerprint'

/**
 * 获取并缓存浏览器指纹
 */
export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchFingerprint() {
      try {
        const fp = await getFingerprint()
        if (mounted) {
          setFingerprint(fp)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err : new Error('Failed to get fingerprint')
          )
          setLoading(false)
        }
      }
    }

    fetchFingerprint()

    return () => {
      mounted = false
    }
  }, [])

  return { fingerprint, loading, error }
}
