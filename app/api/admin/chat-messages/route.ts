import { NextRequest, NextResponse } from 'next/server'
import { getChatMessageScheduleRepo, getDb } from '@/lib/db'
import { getActorFromHeaders } from '@/lib/request-actor'
import { createChatMessageScheduleSchema } from '@/lib/validations'
import { ChatMessageSchedule } from '@/lib/entities/ChatMessageSchedule'
import { AuditLog } from '@/lib/entities/AuditLog'

function ensureAdminOrModerator(request: NextRequest) {
  const actor = getActorFromHeaders(request.headers)
  if (actor.role !== 'admin' && actor.role !== 'moderator') {
    return null
  }
  return actor
}

export async function GET(request: NextRequest) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 스케줄을 조회할 수 있습니다' } },
        { status: 403 }
      )
    }

    const repo = await getChatMessageScheduleRepo()
    const data = await repo.find({ order: { id: 'ASC' } })
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Admin chat message schedule list error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 스케줄을 생성할 수 있습니다' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createChatMessageScheduleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다',
          },
        },
        { status: 400 }
      )
    }

    let created: { id?: number } | null = null
    const db = await getDb()
    await db.transaction(async (manager) => {
      const scheduleRepo = manager.getRepository(ChatMessageSchedule)
      const logRepo = manager.getRepository(AuditLog)

      const schedule = scheduleRepo.create({
        scheduleName: parsed.data.scheduleName,
        messageText: parsed.data.messageText,
        mode: parsed.data.mode,
        intervalMinutes: parsed.data.mode === 'interval' ? (parsed.data.intervalMinutes || null) : null,
        fixedTime: parsed.data.mode === 'fixed_time' ? (parsed.data.fixedTime || null) : null,
        isActive: parsed.data.isActive,
        respectNightBlock: parsed.data.respectNightBlock ?? true,
        lastDispatchedAt: null,
      })

      created = await manager.save(ChatMessageSchedule, schedule)

      const log = logRepo.create({
        action: 'create_chat_schedule',
        targetType: 'chat_message_schedule',
        targetId: Number(created?.id || 0),
        actorId: actor.userId,
        actorName: actor.name,
        details: JSON.stringify({
          scheduleName: parsed.data.scheduleName,
          mode: parsed.data.mode,
        }),
      })
      await manager.save(AuditLog, log)
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    console.error('Admin chat message schedule create error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
