import { NextRequest, NextResponse } from 'next/server'
import { getChatEventRepo, getChatMessageScheduleRepo, getChatMessageTriggerRuleRepo, getDb } from '@/lib/db'
import * as dbModule from '@/lib/db'
import { getOrCreateChatMessageSettings } from '@/lib/chat-message-settings'
import { getExternalApiToken, hasValidExternalApiToken } from '@/lib/external-api-token'
import { isScheduleDue, isWithinNightBlockWindow, type ChatMessageSchedule } from '@/lib/chat-message-schedule'
import { IsNull, Like, MoreThan } from 'typeorm'
import { ChatMessageTriggerRule } from '@/lib/entities/ChatMessageTriggerRule'
import { ChatMessageSchedule as ChatMessageScheduleEntity } from '@/lib/entities/ChatMessageSchedule'
import { ChatMessageDirect as ChatMessageDirectEntity } from '@/lib/entities/ChatMessageDirect'

type ChatMessageDirectRow = {
  id: number
  messageText: string
  dispatchedAt: Date | null
}

type ChatMessageTriggerRuleRow = {
  id: number
  ruleName: string
  keyword: string
  authorName: string | null
  responseText: string
  isActive: boolean
  lastMatchedEventId: number | null
}

type ChatEventRow = {
  id: number
}

function isMetadataNotFoundError(error: unknown) {
  return error instanceof Error && error.name === 'EntityMetadataNotFoundError'
}

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
    const settings = await getOrCreateChatMessageSettings()
    let schedules: ChatMessageSchedule[] = []
    try {
      const repo = await getChatMessageScheduleRepo()
      schedules = (await repo.find({ where: { isActive: true } })) as unknown as ChatMessageSchedule[]
    } catch (error) {
      if (!isMetadataNotFoundError(error)) {
        throw error
      }
      console.error('Chat message schedule metadata unavailable, skipping schedules:', error)
    }
    let triggerRules: ChatMessageTriggerRuleRow[] = []
    let eventRepo: Awaited<ReturnType<typeof getChatEventRepo>> | null = null
    try {
      const triggerRuleRepo = await getChatMessageTriggerRuleRepo()
      eventRepo = await getChatEventRepo()
      triggerRules = (await triggerRuleRepo.find({ where: { isActive: true }, order: { id: 'ASC' } })) as unknown as ChatMessageTriggerRuleRow[]
    } catch (error) {
      if (!isMetadataNotFoundError(error)) {
        throw error
      }
      console.error('Chat message trigger rule metadata unavailable, skipping trigger rules:', error)
    }
    let directMessages: ChatMessageDirectRow[] = []
    const triggerMessages: Array<{ id: number; scheduleName: string; messageText: string; matchedEventId: number }> = []

    try {
      const maybeGetter = (dbModule as { getChatMessageDirectRepo?: unknown }).getChatMessageDirectRepo
      if (typeof maybeGetter === 'function') {
        const directRepo = await maybeGetter()
        const rows = await directRepo.find({
          where: { dispatchedAt: IsNull() },
          order: { createdAt: 'ASC' },
        })
        directMessages = (rows as ChatMessageDirectRow[]).filter((row) => row.dispatchedAt == null)
      }
    } catch (error) {
      console.error('Chat message direct repo unavailable, skipping direct messages:', error)
    }

    const now = new Date()
    const dueSchedules = schedules.filter((schedule) => {
      if (isWithinNightBlockWindow(settings, now) && schedule.respectNightBlock !== false) return false
      return isScheduleDue(schedule, now)
    })

    if (!isWithinNightBlockWindow(settings, now) && eventRepo) {
      const latestEvent = await eventRepo.findOne({ order: { id: 'DESC' } }) as ChatEventRow | null
      const latestEventId = latestEvent?.id ?? null

      for (const rule of triggerRules) {
        const hasStaleCursor =
          typeof rule.lastMatchedEventId === 'number' &&
          typeof latestEventId === 'number' &&
          rule.lastMatchedEventId > latestEventId
        const effectiveCursor = hasStaleCursor ? null : rule.lastMatchedEventId

        const event = await eventRepo.findOne({
          where: {
            id: effectiveCursor ? MoreThan(effectiveCursor) : MoreThan(0),
            ...(rule.authorName ? { authorName: rule.authorName } : {}),
            content: Like(`%${rule.keyword}%`),
          },
          order: { id: 'ASC' },
        }) as ChatEventRow | null

        if (!event) continue
        triggerMessages.push({
          id: rule.id,
          scheduleName: `자동응답: ${rule.ruleName}`,
          messageText: rule.responseText,
          matchedEventId: event.id,
        })
      }
    }

    if (dueSchedules.length > 0 || directMessages.length > 0 || triggerMessages.length > 0) {
      const db = await getDb()
      await db.transaction(async (manager) => {
        const scheduleRepo = manager.getRepository(ChatMessageScheduleEntity)
        const pendingDirectRepo = manager.getRepository(ChatMessageDirectEntity)
        const pendingTriggerRuleRepo = manager.getRepository(ChatMessageTriggerRule)
        for (const schedule of dueSchedules) {
          schedule.lastDispatchedAt = now
          await scheduleRepo.save(schedule)
        }
        for (const direct of directMessages) {
          direct.dispatchedAt = now
          await pendingDirectRepo.save(direct)
        }
        for (const triggered of triggerMessages) {
          await pendingTriggerRuleRepo.update({ id: triggered.id }, { lastMatchedEventId: triggered.matchedEventId })
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
        ...triggerMessages.map((triggered) => ({
          id: triggered.id,
          scheduleName: triggered.scheduleName,
          messageText: triggered.messageText,
        })),
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
