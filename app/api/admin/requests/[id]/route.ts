import { NextRequest, NextResponse } from 'next/server'
import { getAdRequestRepo, getDb } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { reviewSchema } from '@/lib/validations'
import { getRequestCodeExpiryAt, isRequestCodeExpired } from '@/lib/request-code-expiry'
import { getActorFromHeaders } from '@/lib/request-actor'

function stripUser(user: any) {
  if (!user) return null
  return { id: user.id, name: user.name, role: user.role }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request)
  const actorKey = request.headers.get('x-user-id') || request.headers.get('x-user-role') || 'admin'
  const rl = checkRateLimit(`${ip}:admin_lookup_read:${actorKey}`, 'admin_lookup_read')
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMIT_EXCEEDED', message: '조회 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
    )
  }

  try {
    const { id } = await params
    const repo = await getAdRequestRepo()
    const adRequest = await repo.findOne({
      where: { id: Number(id) },
      relations: ['reviewedBy'],
    })

    if (!adRequest) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '요청을 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...adRequest,
      isRequestCodeExpired: isRequestCodeExpired(adRequest.status, adRequest.reviewedAt),
      requestCodeExpiresAt: getRequestCodeExpiryAt(adRequest.reviewedAt),
      reviewedBy: stripUser(adRequest.reviewedBy),
    })
  } catch (error) {
    console.error('Admin request detail error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다' } },
        { status: 400 }
      )
    }

    const actor = getActorFromHeaders(request.headers)
    const userId = actor.userId
    const userName = actor.name

    const repo = await getAdRequestRepo()
    const adRequest = await repo.findOne({
      where: { id: Number(id) },
      relations: ['reviewedBy'],
    })

    if (!adRequest) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '요청을 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    if (adRequest.status !== 'pending') {
      return NextResponse.json(
        { error: { code: 'ALREADY_PROCESSED', message: '이미 처리된 요청입니다' } },
        { status: 409 }
      )
    }

    const db = await getDb()
    await db.transaction(async (manager) => {
      adRequest.status = parsed.data.status
      adRequest.adminReason = parsed.data.reason
      adRequest.reviewedBy = { id: userId } as any
      adRequest.reviewedAt = new Date()
      await manager.save('AdRequest', adRequest)

      const log = manager.getRepository('AuditLog').create({
        action: parsed.data.status === 'approved' ? 'approve' : 'reject',
        targetType: 'ad_request',
        targetId: adRequest.id,
        actorId: userId,
        actorName: userName,
        details: JSON.stringify({
          requestCode: adRequest.requestCode,
          status: parsed.data.status,
          reason: parsed.data.reason,
        }),
      })
      await manager.save('AuditLog', log)
    })

    const updated = await repo.findOne({
      where: { id: Number(id) },
      relations: ['reviewedBy'],
    })

    return NextResponse.json({
      ...updated,
      isRequestCodeExpired: isRequestCodeExpired(updated?.status || '', updated?.reviewedAt || null),
      requestCodeExpiresAt: getRequestCodeExpiryAt(updated?.reviewedAt || null),
      reviewedBy: stripUser(updated?.reviewedBy),
    })
  } catch (error) {
    console.error('Admin review error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
