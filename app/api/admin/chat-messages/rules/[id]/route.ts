import { NextRequest, NextResponse } from 'next/server'
import { getChatMessageTriggerRuleRepo, getDb } from '@/lib/db'
import { getActorFromHeaders } from '@/lib/request-actor'
import { createChatMessageTriggerRuleSchema, updateChatMessageTriggerRuleSchema } from '@/lib/validations'
import { ChatMessageTriggerRule } from '@/lib/entities/ChatMessageTriggerRule'
import { AuditLog } from '@/lib/entities/AuditLog'

function isMetadataNotFoundError(error: unknown) {
  return error instanceof Error && error.name === 'EntityMetadataNotFoundError'
}

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
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 자동응답 룰을 수정할 수 있습니다' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const ruleId = parseId(id)
    if (!ruleId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 룰 ID입니다' } },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = updateChatMessageTriggerRuleSchema.safeParse(body)
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

    const repo = await getChatMessageTriggerRuleRepo()
    const current = await repo.findOneBy({ id: ruleId })
    if (!current) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '자동응답 룰을 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    const merged = {
      ruleName: parsed.data.ruleName ?? current.ruleName,
      keyword: parsed.data.keyword ?? current.keyword,
      authorName: parsed.data.authorName ?? current.authorName,
      responseText: parsed.data.responseText ?? current.responseText,
      isActive: parsed.data.isActive ?? current.isActive,
    }
    const mergedValidation = createChatMessageTriggerRuleSchema.safeParse(merged)
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

    current.ruleName = mergedValidation.data.ruleName
    current.keyword = mergedValidation.data.keyword
    current.authorName = mergedValidation.data.authorName
    current.responseText = mergedValidation.data.responseText
    current.isActive = mergedValidation.data.isActive

    let updated: { id?: number } | null = null
    const db = await getDb()
    await db.transaction(async (manager) => {
      updated = await manager.save(ChatMessageTriggerRule, current)
      const log = manager.getRepository(AuditLog).create({
        action: 'update_chat_trigger_rule',
        targetType: 'chat_message_trigger_rule',
        targetId: ruleId,
        actorId: actor.userId,
        actorName: actor.name,
        details: JSON.stringify({
          ruleName: current.ruleName,
          keyword: current.keyword,
          authorName: current.authorName,
        }),
      })
      await manager.save(AuditLog, log)
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (isMetadataNotFoundError(error)) {
      return NextResponse.json(
        { error: { code: 'FEATURE_UNAVAILABLE', message: '자동응답 룰 기능이 아직 배포되지 않았습니다' } },
        { status: 503 }
      )
    }
    console.error('Admin chat message trigger rule update error:', error)
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
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 자동응답 룰을 삭제할 수 있습니다' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const ruleId = parseId(id)
    if (!ruleId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 룰 ID입니다' } },
        { status: 400 }
      )
    }

    const repo = await getChatMessageTriggerRuleRepo()
    const current = await repo.findOneBy({ id: ruleId })
    if (!current) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '자동응답 룰을 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    const db = await getDb()
    await db.transaction(async (manager) => {
      await manager.remove(ChatMessageTriggerRule, current)
      const log = manager.getRepository(AuditLog).create({
        action: 'delete_chat_trigger_rule',
        targetType: 'chat_message_trigger_rule',
        targetId: ruleId,
        actorId: actor.userId,
        actorName: actor.name,
        details: JSON.stringify({
          ruleName: current.ruleName,
        }),
      })
      await manager.save(AuditLog, log)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isMetadataNotFoundError(error)) {
      return NextResponse.json(
        { error: { code: 'FEATURE_UNAVAILABLE', message: '자동응답 룰 기능이 아직 배포되지 않았습니다' } },
        { status: 503 }
      )
    }
    console.error('Admin chat message trigger rule delete error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
