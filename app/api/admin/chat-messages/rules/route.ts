import { NextRequest, NextResponse } from 'next/server'
import { getChatMessageTriggerRuleRepo, getDb } from '@/lib/db'
import { getActorFromHeaders } from '@/lib/request-actor'
import { createChatMessageTriggerRuleSchema } from '@/lib/validations'
import { ChatMessageTriggerRule } from '@/lib/entities/ChatMessageTriggerRule'

function isMetadataNotFoundError(error: unknown) {
  return error instanceof Error && error.name === 'EntityMetadataNotFoundError'
}

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
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 자동응답 룰을 조회할 수 있습니다' } },
        { status: 403 }
      )
    }

    const repo = await getChatMessageTriggerRuleRepo()
    const data = await repo.find({ order: { id: 'ASC' } })
    return NextResponse.json({ data })
  } catch (error) {
    if (isMetadataNotFoundError(error)) {
      return NextResponse.json({ data: [] })
    }
    console.error('Admin chat message trigger rule list error:', error)
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
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 자동응답 룰을 생성할 수 있습니다' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createChatMessageTriggerRuleSchema.safeParse(body)
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
      const ruleRepo = manager.getRepository(ChatMessageTriggerRule)
      const logRepo = manager.getRepository('AuditLog')

      const rule = ruleRepo.create({
        ruleName: parsed.data.ruleName,
        keyword: parsed.data.keyword,
        authorName: parsed.data.authorName,
        responseText: parsed.data.responseText,
        isActive: parsed.data.isActive,
        lastMatchedEventId: null,
      })

      created = await manager.save(ChatMessageTriggerRule, rule)

      const log = logRepo.create({
        action: 'create_chat_trigger_rule',
        targetType: 'chat_message_trigger_rule',
        targetId: Number(created?.id || 0),
        actorId: actor.userId,
        actorName: actor.name,
        details: JSON.stringify({
          ruleName: parsed.data.ruleName,
          keyword: parsed.data.keyword,
          authorName: parsed.data.authorName,
        }),
      })
      await manager.save('AuditLog', log)
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    if (isMetadataNotFoundError(error)) {
      return NextResponse.json(
        { error: { code: 'FEATURE_UNAVAILABLE', message: '자동응답 룰 기능이 아직 배포되지 않았습니다' } },
        { status: 503 }
      )
    }
    console.error('Admin chat message trigger rule create error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
