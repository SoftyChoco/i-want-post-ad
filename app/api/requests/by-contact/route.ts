import { NextRequest, NextResponse } from 'next/server'
import { getAdRequestRepo } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { resolveLlmStatus } from '@/lib/llm-status'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REQUEST_CODE_REGEX = /^REQ-\d{8}-[A-Z0-9]{4}$/i

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit(ip, 'public_lookup_contact')
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
    )
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const queryRaw =
      searchParams.get('query') ||
      searchParams.get('contact') ||
      searchParams.get('requestCode') ||
      searchParams.get('code')

    if (!queryRaw || queryRaw.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'MISSING_PARAM', message: '이메일 주소 또는 요청코드를 입력해주세요' } },
        { status: 400 }
      )
    }

    const query = queryRaw.trim()
    const isEmail = EMAIL_REGEX.test(query)
    const isRequestCode = REQUEST_CODE_REGEX.test(query)

    if (!isEmail && !isRequestCode) {
      return NextResponse.json(
        { error: { code: 'INVALID_PARAM', message: '올바른 이메일 주소 또는 요청코드를 입력해주세요' } },
        { status: 400 }
      )
    }

    const repo = await getAdRequestRepo()
    const requests = isRequestCode
      ? await repo.find({
          where: { requestCode: query.toUpperCase() },
          order: { createdAt: 'DESC' },
          take: 1,
        })
      : await repo.find({
          where: { applicantContact: query.toLowerCase() },
          order: { createdAt: 'DESC' },
          take: 20,
        })

    const data = requests.map(r => ({
      requestCode: r.requestCode,
      applicantName: r.applicantName,
      applicantEmail: r.applicantContact,
      contentType: r.contentType,
      contentBody: r.contentBody,
      contentUrl: r.contentUrl,
      llmStatus: resolveLlmStatus(r.llmStatus, r.llmVerdict),
      llmVerdict: r.llmVerdict,
      llmReason: r.llmReason,
      status: r.status,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt || null,
      rejectionReasonSummary: r.status === 'rejected' ? r.adminReason : null,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Request lookup error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
