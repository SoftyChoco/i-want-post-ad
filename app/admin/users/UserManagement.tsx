'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type UserItem = { id: number; email: string; name: string; role: string; createdAt: string }
type IssuedCredential = { name: string; email: string; temporaryPassword: string; source: 'create' | 'reset' }

export default function UserManagement({ initialUsers, currentUserId }: { initialUsers: UserItem[]; currentUserId: number }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issuedCredential, setIssuedCredential] = useState<IssuedCredential | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.message || '추가 실패')
        return
      }
      setIssuedCredential({
        name: data.name,
        email: data.email,
        temporaryPassword: data.temporaryPassword,
        source: 'create',
      })
      setEmail(''); setName('')
      router.refresh()
    } catch { setError('네트워크 오류') }
    finally { setLoading(false) }
  }

  const handleResetPassword = async (user: UserItem) => {
    if (!window.confirm(`${user.name} 계정 비밀번호를 초기화하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error?.message || '비밀번호 초기화 실패')
        return
      }
      setIssuedCredential({
        name: data.name,
        email: data.email,
        temporaryPassword: data.temporaryPassword,
        source: 'reset',
      })
    } catch {
      alert('네트워크 오류')
    }
  }

  const copyTemporaryPassword = async () => {
    if (!issuedCredential) return
    await navigator.clipboard.writeText(issuedCredential.temporaryPassword)
    alert('초기 비밀번호를 복사했습니다')
  }

  const handleDelete = async (userId: number) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error?.message || '삭제 실패')
        return
      }
      router.refresh()
    } catch { alert('네트워크 오류') }
  }

  return (
    <>
      <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">부방장 추가</h2>
        <p className="text-sm text-gray-600 mb-4">
          비밀번호는 시스템이 자동으로 초기화합니다. 추가 후 발급되는 초기 비밀번호를 전달해주세요.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름" required className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" required className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? '추가중...' : '추가'}
        </button>
      </form>

      {issuedCredential && (
        <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <h3 className="font-semibold mb-2">
            {issuedCredential.source === 'create' ? '초기 비밀번호 발급 완료' : '비밀번호 초기화 완료'}
          </h3>
          <p className="mb-2">
            <strong>{issuedCredential.name}</strong> ({issuedCredential.email})
          </p>
          <div className="flex items-center gap-2">
            <code className="px-2 py-1 rounded bg-white border border-amber-300 text-amber-900">{issuedCredential.temporaryPassword}</code>
            <button type="button" onClick={copyTemporaryPassword} className="px-3 py-1 text-xs bg-amber-200 rounded hover:bg-amber-300">
              복사
            </button>
          </div>
          <p className="mt-2 text-xs">초기 비밀번호는 1회 안내 후 별도 보관되지 않도록 주의해주세요.</p>
        </section>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 text-left text-gray-600 bg-gray-50">
            <th className="py-3 px-4 font-medium">이름</th><th className="py-3 px-4 font-medium">이메일</th>
            <th className="py-3 px-4 font-medium">역할</th><th className="py-3 px-4 font-medium">생성일</th><th className="py-3 px-4 font-medium"></th>
          </tr></thead>
          <tbody>
            {initialUsers.map(u => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="py-3 px-4">{u.name}</td><td className="py-3 px-4">{u.email}</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 text-xs rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{u.role === 'admin' ? '방장' : '부방장'}</span></td>
                <td className="py-3 px-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                <td className="py-3 px-4">
                  {u.role !== 'admin' && u.id !== currentUserId && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleResetPassword(u)} className="text-xs text-orange-600 hover:underline">비밀번호 초기화</button>
                      <button onClick={() => handleDelete(u.id)} className="text-xs text-red-600 hover:underline">삭제</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
