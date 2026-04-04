import { NextRequest, NextResponse } from 'next/server'
import { getActorFromHeaders } from '@/lib/request-actor'
import { listAutoReplyGuardUsers, updateAutoReplyGuardUserById } from '@/lib/chat-auto-reply-guard'
import { patchAutoReplyGuardUserSchema } from '@/lib/validations'
import { getDb } from '@/lib/db'
import { AuditLog } from '@/lib/entities/AuditLog'

function ensureAdminOrModerator(request: NextRequest) {
  const actor = getActorFromHeaders(request.headers)
  if (actor.role !== 'admin' && actor.role !== 'moderator') return null
  return actor
}

function parseId(value: string): number | null {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) return null
  return id
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }, { status: 403 })
    }

    const { id } = await params
    const userId = parseId(id)
    if (!userId) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 사용자 ID입니다' } }, { status: 400 })
    }

    const body = await request.json()
    const parsed = patchAutoReplyGuardUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다' },
      }, { status: 400 })
    }

    const ok = await updateAutoReplyGuardUserById(userId, parsed.data)
    if (!ok) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다' } }, { status: 404 })
    }

    if (typeof parsed.data.isBlocked === 'boolean') {
      const db = await getDb()
      const logRepo = db.getRepository(AuditLog)
      const log = logRepo.create({
        action: parsed.data.isBlocked ? 'block_auto_reply_user' : 'unblock_auto_reply_user',
        targetType: 'auto_reply_guard_user',
        targetId: userId,
        actorId: actor.userId,
        actorName: actor.name,
        details: JSON.stringify({ id: userId }),
      })
      await logRepo.save(log)
    }

    const users = await listAutoReplyGuardUsers()
    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('Auto-reply guard user patch error:', error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } }, { status: 500 })
  }
}
