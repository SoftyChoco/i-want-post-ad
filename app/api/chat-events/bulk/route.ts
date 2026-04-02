import { NextRequest, NextResponse } from 'next/server'
import { getChatEventBatchRepo, getDb } from '@/lib/db'
import { getExternalApiToken, hasValidExternalApiToken } from '@/lib/external-api-token'
import { createChatEventsBulkSchema } from '@/lib/validations'
import { ChatEventBatch } from '@/lib/entities/ChatEventBatch'
import { ChatEvent } from '@/lib/entities/ChatEvent'

function isUniqueIdempotencyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.message.includes('UNIQUE constraint failed') && error.message.includes('chat_event_batches.idempotency_key')
}

export async function POST(request: NextRequest) {
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

  const idempotencyKey = request.headers.get('idempotency-key')?.trim() || ''
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Idempotency-Key 헤더가 필요합니다' } },
      { status: 400 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = createChatEventsBulkSchema.safeParse(body)
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

  const batchRepo = await getChatEventBatchRepo()
  const existing = await batchRepo.findOneBy({ idempotencyKey })
  if (existing) {
    return NextResponse.json({ accepted: existing.accepted })
  }

  const accepted = parsed.data.events.length

  try {
    const db = await getDb()
    await db.transaction(async (manager) => {
      const txBatchRepo = manager.getRepository(ChatEventBatch)
      const txEventRepo = manager.getRepository(ChatEvent)

      const batch = txBatchRepo.create({
        idempotencyKey,
        accepted,
      })
      const savedBatch = await manager.save(ChatEventBatch, batch)

      const events = parsed.data.events.map((event) =>
        txEventRepo.create({
          batchId: savedBatch.id,
          observedAt: new Date(event.observedAt),
          authorName: event.authorName,
          content: event.content,
        })
      )

      await manager.save(ChatEvent, events)
    })

    return NextResponse.json({ accepted })
  } catch (error) {
    if (isUniqueIdempotencyError(error)) {
      const duplicated = await batchRepo.findOneBy({ idempotencyKey })
      if (duplicated) {
        return NextResponse.json({ accepted: duplicated.accepted })
      }
    }

    console.error('Chat events bulk save error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
