import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserRepo } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import UserManagement from './UserManagement'

export default async function UsersPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/login')
  const user = await verifyToken(token)
  if (!user) redirect('/login')

  if (user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-4">권한이 없습니다</p>
        <Link href="/admin" className="text-blue-600 hover:underline">목록으로 돌아가기</Link>
      </div>
    )
  }

    const repo = await getUserRepo()
    const users = await repo.find({
    order: { createdAt: 'DESC' },
    select: ['id', 'email', 'name', 'role', 'createdAt'],
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부방장 관리</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">← 목록으로</Link>
      </div>
      <UserManagement initialUsers={users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt.toISOString() }))} currentUserId={user.userId} />
    </div>
  )
}
