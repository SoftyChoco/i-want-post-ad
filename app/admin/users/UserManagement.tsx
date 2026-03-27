'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type UserItem = { id: number; email: string; name: string; role: string; createdAt: string }

export default function UserManagement({ initialUsers, currentUserId }: { initialUsers: UserItem[]; currentUserId: number }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message || '추가 실패')
        return
      }
      setEmail(''); setPassword(''); setName('')
      router.refresh()
    } catch { setError('네트워크 오류') }
    finally { setLoading(false) }
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름" required className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" required className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호 (8자 이상)" required minLength={8} className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? '추가중...' : '추가'}
        </button>
      </form>
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
                <td className="py-3 px-4">{u.role !== 'admin' && u.id !== currentUserId && <button onClick={() => handleDelete(u.id)} className="text-xs text-red-600 hover:underline">삭제</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
