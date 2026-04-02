import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getActorFromHeaders } from '@/lib/request-actor'
import { createDirectChatMessageSchema } from '@/lib/validations'

function ensureAdminOrModerator(request: NextRequest) {
  const actor = getActorFromHeaders(request.headers)
  if (actor.role !== 'admin' && actor.role !== 'moderator') {
    return null
  }
  return actor
}

export async function POST(request: NextRequest) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 직접 메시지를 작성할 수 있습니다' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createDirectChatMessageSchema.safeParse(body)
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
      const directRepo = manager.getRepository('ChatMessageDirect')
      const logRepo = manager.getRepository('AuditLog')

      const direct = directRepo.create({
        messageText: parsed.data.messageText,
        createdById: actor.userId,
        createdByName: actor.name,
        dispatchedAt: null,
      })

      created = await manager.save('ChatMessageDirect', direct)

      const log = logRepo.create({
        action: 'create_chat_direct',
        targetType: 'chat_message_direct',
        targetId: Number(created?.id || 0),
        actorId: actor.userId,
        actorName: actor.name,
        details: JSON.stringify({
          messagePreview: parsed.data.messageText.slice(0, 40),
        }),
      })
      await manager.save('AuditLog', log)
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    console.error('Admin direct chat message create error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
