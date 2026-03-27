'use client'

import { useState } from 'react'

export default function PolicyEditor({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [savedVersion, setSavedVersion] = useState<string | null>(null)

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSaved(false)
    setSavedVersion(null)

    try {
      const res = await fetch('/api/admin/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error?.message || '정책 저장 중 오류가 발생했습니다')
        return
      }

      setSaved(true)
      setSavedVersion(typeof data.version === 'string' ? data.version : null)
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-[65vh] font-mono text-sm leading-6 p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        spellCheck={false}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '저장 중...' : '정책 저장'}
        </button>
        {saved && (
          <span className="text-sm text-green-700">
            저장되었습니다{savedVersion ? ` (v${savedVersion})` : ''}
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
