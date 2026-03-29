'use client'

import { useState } from 'react'

export default function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSuccess(null)
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호 확인이 일치하지 않습니다')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '비밀번호 변경에 실패했습니다')
        return
      }

      setSuccess(data.message || '비밀번호가 변경되었습니다')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-lg p-6">
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
          현재 비밀번호
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
          새 비밀번호
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={8}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">8자 이상 입력해주세요.</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          새 비밀번호 확인
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '변경중...' : '비밀번호 변경'}
      </button>
    </form>
  )
}
