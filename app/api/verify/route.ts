import { NextRequest, NextResponse } from 'next/server'
import { getAdRequestRepo } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { isRequestCodeExpired } from '@/lib/request-code-expiry'
import { hasValidExternalApiToken } from '@/lib/external-api-token'

export async function GET(request: NextRequest) {
  const isExternalTokenRequest = hasValidExternalApiToken(request.headers.get('authorization'))

  if (!isExternalTokenRequest) {
    const ip = getClientIp(request)
    const rl = checkRateLimit(ip, 'verify')
    if (!rl.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
      )
    }
  }

  const requestCode = request.nextUrl.searchParams.get('requestCode') || request.nextUrl.searchParams.get('code')
  if (!requestCode) {
    return NextResponse.json(
      { error: { code: 'MISSING_CODE', message: '요청코드를 입력해주세요' } },
      { status: 400 }
    )
  }

  try {
    const repo = await getAdRequestRepo()
    const adRequest = await repo.findOne({
      where: { requestCode: requestCode.toUpperCase() },
      relations: ['reviewedBy'],
    })

    if (isExternalTokenRequest) {
      if (!adRequest) {
        return NextResponse.json({
          status: 'not_found',
          expired: false,
          reviewedAt: null,
        })
      }

      if (adRequest.status === 'pending') {
        return NextResponse.json({
          status: 'pending',
          expired: false,
          reviewedAt: null,
        })
      }

      if (adRequest.status === 'rejected') {
        return NextResponse.json({
          status: 'rejected',
          expired: false,
          reviewedAt: adRequest.reviewedAt,
        })
      }

      if (adRequest.status !== 'approved') {
        return NextResponse.json({
          status: 'not_found',
          expired: false,
          reviewedAt: null,
        })
      }

      return NextResponse.json({
        status: 'approved',
        expired: isRequestCodeExpired(adRequest.status, adRequest.reviewedAt),
        reviewedAt: adRequest.reviewedAt,
      })
    }

    if (!adRequest || adRequest.status !== 'approved') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '유효한 승인 완료 요청코드를 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    if (isRequestCodeExpired(adRequest.status, adRequest.reviewedAt)) {
      return NextResponse.json(
        {
          error: {
            code: 'EXPIRED',
            message: '요청코드 유효기간(24시간)이 만료되었습니다',
          },
        },
        { status: 410 }
      )
    }

    return NextResponse.json({
      valid: true,
      requestCode: adRequest.requestCode,
      contentTitle: adRequest.contentTitle,
      contentType: adRequest.contentType,
      approvedAt: adRequest.reviewedAt,
      approvedBy: adRequest.reviewedBy?.name || '-',
    })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
