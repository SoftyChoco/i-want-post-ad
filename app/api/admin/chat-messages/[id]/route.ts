import { NextRequest, NextResponse } from 'next/server'
import { getChatMessageScheduleRepo, getDb } from '@/lib/db'
import { getActorFromHeaders } from '@/lib/request-actor'
import { createChatMessageScheduleSchema, updateChatMessageScheduleSchema } from '@/lib/validations'

function parseId(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function ensureAdminOrModerator(request: NextRequest) {
  const actor = getActorFromHeaders(request.headers)
  if (actor.role !== 'admin' && actor.role !== 'moderator') {
    return null
  }
  return actor
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 스케줄을 수정할 수 있습니다' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const scheduleId = parseId(id)
    if (!scheduleId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 스케줄 ID입니다' } },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = updateChatMessageScheduleSchema.safeParse(body)
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

    const repo = await getChatMessageScheduleRepo()
    const current = await repo.findOneBy({ id: scheduleId })
    if (!current) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '스케줄을 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    const merged = {
      scheduleName: parsed.data.scheduleName ?? current.scheduleName,
      messageText: parsed.data.messageText ?? current.messageText,
      mode: parsed.data.mode ?? current.mode,
      intervalMinutes: parsed.data.intervalMinutes ?? current.intervalMinutes,
      fixedTime: parsed.data.fixedTime ?? current.fixedTime,
      isActive: parsed.data.isActive ?? current.isActive,
    }
    const mergedValidation = createChatMessageScheduleSchema.safeParse(merged)
    if (!mergedValidation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: mergedValidation.error.issues[0]?.message || '입력값이 올바르지 않습니다',
          },
        },
        { status: 400 }
      )
    }

    current.scheduleName = mergedValidation.data.scheduleName
    current.messageText = mergedValidation.data.messageText
    current.mode = mergedValidation.data.mode
    current.intervalMinutes = mergedValidation.data.mode === 'interval' ? (mergedValidation.data.intervalMinutes || null) : null
    current.fixedTime = mergedValidation.data.mode === 'fixed_time' ? (mergedValidation.data.fixedTime || null) : null
    current.isActive = mergedValidation.data.isActive

    let updated: Record<string, unknown> | null = null
    const db = await getDb()
    await db.transaction(async (manager) => {
      updated = await manager.save('ChatMessageSchedule', current)
      const log = manager.getRepository('AuditLog').create({
        action: 'update_chat_schedule',
        targetType: 'chat_message_schedule',
        targetId: scheduleId,
        actorId: actor.userId,
        actorName: actor.name,
        details: JSON.stringify({
          scheduleName: current.scheduleName,
          mode: current.mode,
        }),
      })
      await manager.save('AuditLog', log)
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Admin chat message schedule update error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 스케줄을 삭제할 수 있습니다' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const scheduleId = parseId(id)
    if (!scheduleId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 스케줄 ID입니다' } },
        { status: 400 }
      )
    }

    const repo = await getChatMessageScheduleRepo()
    const current = await repo.findOneBy({ id: scheduleId })
    if (!current) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '스케줄을 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    const db = await getDb()
    await db.transaction(async (manager) => {
      await manager.remove('ChatMessageSchedule', current)
      const log = manager.getRepository('AuditLog').create({
        action: 'delete_chat_schedule',
        targetType: 'chat_message_schedule',
        targetId: scheduleId,
        actorId: actor.userId,
        actorName: actor.name,
        details: JSON.stringify({
          scheduleName: current.scheduleName,
        }),
      })
      await manager.save('AuditLog', log)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin chat message schedule delete error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
