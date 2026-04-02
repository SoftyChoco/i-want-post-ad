import { NextRequest, NextResponse } from 'next/server'
import { getChatMessageDirectRepo, getChatMessageScheduleRepo, getDb } from '@/lib/db'
import { getOrCreateChatMessageSettings } from '@/lib/chat-message-settings'
import { getExternalApiToken, hasValidExternalApiToken } from '@/lib/external-api-token'
import { isScheduleDue, isWithinNightBlockWindow, type ChatMessageSchedule } from '@/lib/chat-message-schedule'

export async function GET(request: NextRequest) {
  const externalToken = getExternalApiToken()
  if (!externalToken) {
    return NextResponse.json(
      { error: { code: 'MISCONFIGURED', message: 'KAKAO_BOT_TOKEN is not configured' } },
      { status: 500 }
    )
  }

  if (!hasValidExternalApiToken(request.headers.get('authorization'))) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Invalid external API token' } },
      { status: 403 }
    )
  }

  try {
    const repo = await getChatMessageScheduleRepo()
    const directRepo = await getChatMessageDirectRepo()
    const settings = await getOrCreateChatMessageSettings()
    const schedules = (await repo.find({ where: { isActive: true } })) as unknown as ChatMessageSchedule[]
    const directMessages = await directRepo.find({
      where: { dispatchedAt: null },
      order: { createdAt: 'ASC' },
    })
    const now = new Date()
    const dueSchedules = schedules.filter((schedule) => {
      if (isWithinNightBlockWindow(settings, now)) return false
      return isScheduleDue(schedule, now)
    })

    if (dueSchedules.length > 0 || directMessages.length > 0) {
      const db = await getDb()
      await db.transaction(async (manager) => {
        const scheduleRepo = manager.getRepository('ChatMessageSchedule')
        const pendingDirectRepo = manager.getRepository('ChatMessageDirect')
        for (const schedule of dueSchedules) {
          schedule.lastDispatchedAt = now
          await scheduleRepo.save(schedule)
        }
        for (const direct of directMessages) {
          direct.dispatchedAt = now
          await pendingDirectRepo.save(direct)
        }
      })
    }

    const directPayload = directMessages.map((direct) => ({
      id: direct.id,
      scheduleName: '직접 메시지',
      messageText: direct.messageText,
    }))

    return NextResponse.json({
      data: [
        ...dueSchedules.map((schedule) => ({
          id: schedule.id,
          scheduleName: schedule.scheduleName,
          messageText: schedule.messageText,
        })),
        ...directPayload,
      ],
      checkedAt: now.toISOString(),
    })
  } catch (error) {
    console.error('Chat message poll error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
