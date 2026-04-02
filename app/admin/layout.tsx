import { cookies } from 'next/headers'
import Link from 'next/link'
import { verifyToken } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const user = token ? await verifyToken(token) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-sm font-medium text-gray-900 hover:text-blue-600">대기 목록</Link>
              {user?.role === 'admin' && (
                <Link href="/admin/users" className="text-sm font-medium text-gray-600 hover:text-blue-600">부방장 관리</Link>
              )}
              {user?.role === 'admin' && (
                <Link href="/admin/policy" className="text-sm font-medium text-gray-600 hover:text-blue-600">정책 편집</Link>
              )}
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <Link href="/admin/chat-messages" className="text-sm font-medium text-gray-600 hover:text-blue-600">채팅 메시지 관리</Link>
              )}
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <Link href="/admin/logs" className="text-sm font-medium text-gray-600 hover:text-blue-600">감사 로그</Link>
              )}
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <Link href="/admin/password" className="text-sm font-medium text-gray-600 hover:text-blue-600">비밀번호 변경</Link>
              )}
            </div>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">홈</Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
