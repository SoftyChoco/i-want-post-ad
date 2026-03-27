import { NextRequest, NextResponse } from 'next/server'
import { getAdRequestRepo } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { LessThan, Like } from 'typeorm'
import { REQUEST_CODE_EXPIRY_MS, getRequestCodeExpiryAt, isRequestCodeExpired } from '@/lib/request-code-expiry'

export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams
    const statusFilter = searchParams.get('status') || 'pending'
    const requestCodeFilter = (searchParams.get('requestCode') || '').trim().toUpperCase()
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20))

    const repo = await getAdRequestRepo()
    const where: Record<string, unknown> = {}
    if (statusFilter === 'expired') {
      where.status = 'approved'
      where.reviewedAt = LessThan(new Date(Date.now() - REQUEST_CODE_EXPIRY_MS))
    } else if (statusFilter !== 'all') {
      where.status = statusFilter
    }
    if (requestCodeFilter) {
      where.requestCode = Like(`%${requestCodeFilter}%`)
    }

    const [requests, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['reviewedBy'],
    })

    const data = requests.map(r => {
      const isExpired = isRequestCodeExpired(r.status, r.reviewedAt)
      return {
        ...r,
        isRequestCodeExpired: isExpired,
        requestCodeExpiresAt: getRequestCodeExpiryAt(r.reviewedAt),
        reviewedBy: r.reviewedBy ? { id: r.reviewedBy.id, name: r.reviewedBy.name, role: r.reviewedBy.role } : null,
      }
    })

    return NextResponse.json({
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Admin requests list error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
