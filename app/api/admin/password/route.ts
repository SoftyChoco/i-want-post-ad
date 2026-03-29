import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, hashPassword } from '@/lib/auth'
import { getDb, getUserRepo } from '@/lib/db'
import { getActorFromHeaders } from '@/lib/request-actor'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { changePasswordSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  const actor = getActorFromHeaders(request.headers)
  if (actor.role !== 'admin' && actor.role !== 'moderator') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    )
  }

  const ip = getClientIp(request)
  const rl = checkRateLimit(`${ip}:password_change:${actor.userId}`, 'password_change')
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다' } },
        { status: 400 }
      )
    }

    const userRepo = await getUserRepo()
    const user = await userRepo.findOneBy({ id: actor.userId })
    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: '인증이 필요합니다' } },
        { status: 401 }
      )
    }

    const valid = await comparePassword(parsed.data.currentPassword, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: { code: 'AUTH_INVALID_CREDENTIALS', message: '현재 비밀번호가 올바르지 않습니다' } },
        { status: 401 }
      )
    }

    const newPasswordHash = await hashPassword(parsed.data.newPassword)
    const db = await getDb()
    await db.transaction(async (manager) => {
      await manager.getRepository('User').update(
        { id: actor.userId },
        { passwordHash: newPasswordHash }
      )

      const log = manager.getRepository('AuditLog').create({
        action: 'change_password',
        targetType: 'user',
        targetId: actor.userId,
        actorId: actor.userId,
        actorName: actor.name,
        details: null,
      })
      await manager.save('AuditLog', log)
    })

    return NextResponse.json({ success: true, message: '비밀번호가 변경되었습니다' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
