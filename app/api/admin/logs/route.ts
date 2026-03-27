import { NextRequest, NextResponse } from 'next/server'
import { getAuditLogRepo } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role')
    if (role !== 'admin' && role !== 'moderator') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 감사 로그를 조회할 수 있습니다' } },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const actionFilter = searchParams.get('action')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))

    const where: Record<string, any> = {}
    if (actionFilter) where.action = actionFilter

    const repo = await getAuditLogRepo()
    const [logs, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Audit logs error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
