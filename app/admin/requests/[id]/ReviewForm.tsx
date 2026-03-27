'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReviewForm({ requestId }: { requestId: number }) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (action: 'approved' | 'rejected') => {
    if (!reason.trim()) {
      setError('사유를 입력해주세요')
      return
    }
    const label = action === 'approved' ? '승인' : '거절'
    if (!window.confirm(`정말 ${label}하시겠습니까?`)) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: action, reason: reason.trim() }),
      })
      if (res.status === 409) {
        alert('다른 관리자가 이미 처리했습니다')
        router.refresh()
        return
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message || '처리 중 오류가 발생했습니다')
        return
      }
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">관리자 처리</h3>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="승인/거절 사유를 입력하세요"
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        rows={3}
        disabled={loading}
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 mt-4">
        <button onClick={() => handleAction('approved')} disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? '처리중...' : '승인'}
        </button>
        <button onClick={() => handleAction('rejected')} disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? '처리중...' : '거절'}
        </button>
      </div>
    </div>
  )
}
