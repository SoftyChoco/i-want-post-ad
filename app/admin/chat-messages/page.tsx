import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getChatMessageScheduleRepo, getChatMessageTriggerRuleRepo } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import ScheduleManager from './ScheduleManager'
import { getOrCreateChatMessageSettings } from '@/lib/chat-message-settings'

function isMetadataNotFoundError(error: unknown) {
  return error instanceof Error && error.name === 'EntityMetadataNotFoundError'
}

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
  let triggerRules: Array<{
    id: number
    ruleName: string
    keyword: string
    authorName: string | null
    responseText: string
    isActive: boolean
    lastMatchedEventId: number | null
  }> = []
  try {
    const triggerRuleRepo = await getChatMessageTriggerRuleRepo()
    triggerRules = await triggerRuleRepo.find({ order: { id: 'ASC' } })
  } catch (error) {
    if (!isMetadataNotFoundError(error)) {
      throw error
    }
    console.error('Trigger rule metadata unavailable, rendering with empty rules:', error)
  }
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
          mode: s.mode as 'interval' | 'fixed_time',
          intervalMinutes: s.intervalMinutes,
          fixedTime: s.fixedTime,
          isActive: s.isActive,
        }))}
        initialTriggerRules={triggerRules.map((rule) => ({
          id: rule.id,
          ruleName: rule.ruleName,
          keyword: rule.keyword,
          authorName: rule.authorName,
          responseText: rule.responseText,
          isActive: rule.isActive,
          lastMatchedEventId: rule.lastMatchedEventId,
        }))}
      />
    </div>
  )
}
