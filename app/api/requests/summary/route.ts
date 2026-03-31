import { NextRequest, NextResponse } from 'next/server'
import { getAdRequestRepo } from '@/lib/db'
import { getExternalApiToken, hasValidExternalApiToken } from '@/lib/external-api-token'

export async function GET(request: NextRequest) {
  const externalToken = getExternalApiToken()
  if (!externalToken) {
    return NextResponse.json(
      { error: { code: 'MISCONFIGURED', message: 'EXTERNAL_API_TOKEN is not configured' } },
      { status: 500 }
    )
  }

  if (!hasValidExternalApiToken(request.headers.get('authorization'))) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Invalid external API token' } },
      { status: 403 }
    )
  }

  try {
    const repo = await getAdRequestRepo()
    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      repo.countBy({ status: 'pending' }),
      repo.countBy({ status: 'approved' }),
      repo.countBy({ status: 'rejected' }),
    ])

    return NextResponse.json({
      hasPending: pendingCount > 0,
      pendingCount,
      statusCounts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Requests summary error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
