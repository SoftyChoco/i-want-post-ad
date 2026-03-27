'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AutoRefreshOnProcessing({ enabled }: { enabled: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled) return

    const timer = setInterval(() => {
      router.refresh()
    }, 5000)

    return () => clearInterval(timer)
  }, [enabled, router])

  return null
}
