'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRejudgeButtonLabel, shouldClearRejudgeNotice } from './rejudge-ui-state'

export default function RejudgeButton({ requestId, isProcessing }: { requestId: number; isProcessing: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (shouldClearRejudgeNotice(isProcessing)) {
      setNotice(null)
    }
  }, [isProcessing])

  const handleRejudge = async () => {
    if (!window.confirm('AI 자동 판정을 다시 실행하시겠습니까?')) return

    setLoading(true)
    setError(null)
    setNotice(null)

    try {
      const res = await fetch(`/api/admin/requests/${requestId}/rejudge`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error?.message || '재판정 중 오류가 발생했습니다')
        return
      }

      const data = await res.json().catch(() => ({}))
      setNotice(data.message || '재판정을 요청했습니다. 잠시 후 결과가 반영됩니다.')
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleRejudge}
        disabled={loading || isProcessing}
        className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {getRejudgeButtonLabel(loading, isProcessing)}
      </button>
      {notice && <p className="mt-2 text-sm text-blue-700">{notice}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
