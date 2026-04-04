import { NextRequest, NextResponse } from 'next/server'
import { getActorFromHeaders } from '@/lib/request-actor'
import { listAutoReplyGuardUsers, upsertAutoReplyGuardUser } from '@/lib/chat-auto-reply-guard'
import { upsertAutoReplyGuardUserSchema } from '@/lib/validations'

function ensureAdminOrModerator(request: NextRequest) {
  const actor = getActorFromHeaders(request.headers)
  if (actor.role !== 'admin' && actor.role !== 'moderator') return null
  return actor
}

export async function GET(request: NextRequest) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }, { status: 403 })
    }

    const users = await listAutoReplyGuardUsers()
    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('Auto-reply guard users list error:', error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }, { status: 403 })
    }

    const body = await request.json()
    const parsed = upsertAutoReplyGuardUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다' },
      }, { status: 400 })
    }

    await upsertAutoReplyGuardUser({
      authorName: parsed.data.authorName.trim(),
      isWhitelisted: parsed.data.isWhitelisted,
      customWarnCount: parsed.data.customWarnCount ?? null,
      customBlockCount: parsed.data.customBlockCount ?? null,
    })

    const users = await listAutoReplyGuardUsers()
    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('Auto-reply guard users upsert error:', error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } }, { status: 500 })
  }
}
