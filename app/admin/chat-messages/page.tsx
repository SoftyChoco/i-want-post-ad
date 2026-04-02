import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getChatMessageScheduleRepo } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import ScheduleManager from './ScheduleManager'
import { getOrCreateChatMessageSettings } from '@/lib/chat-message-settings'

export default async function AdminChatMessagesPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/login')

  const user = await verifyToken(token)
  if (!user) redirect('/login')

  if (user.role !== 'admin' && user.role !== 'moderator') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-4">권한이 없습니다</p>
        <Link href="/admin" className="text-blue-600 hover:underline">목록으로 돌아가기</Link>
      </div>
    )
  }

  const repo = await getChatMessageScheduleRepo()
  const schedules = await repo.find({ order: { id: 'ASC' } })
  const settings = await getOrCreateChatMessageSettings()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">채팅방 메시지 관리</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">← 목록으로</Link>
      </div>
      <ScheduleManager
        initialSettings={settings}
        initialSchedules={schedules.map((s) => ({
          id: s.id,
          scheduleName: s.scheduleName,
          messageText: s.messageText,
          mode: s.mode,
          intervalMinutes: s.intervalMinutes,
          fixedTime: s.fixedTime,
          isActive: s.isActive,
        }))}
      />
    </div>
  )
}
