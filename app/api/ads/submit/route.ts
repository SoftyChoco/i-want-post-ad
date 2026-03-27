import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getAdRequestRepo } from '@/lib/db'
import { adSubmitSchema } from '@/lib/validations'
import { generateRequestCode } from '@/lib/codes'
import { getPolicyVersion } from '@/lib/policy'
import { judgeAdContent } from '@/lib/llm'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

async function runAsyncJudgment(
  adRequestId: number,
  llmAttemptId: string,
  input: { contentType: string; contentBody: string; contentUrl?: string }
) {
  try {
    const judgment = await judgeAdContent(input)
    const repo = await getAdRequestRepo()
    await repo.update(
      { id: adRequestId, llmStatus: 'processing', llmAttemptId },
      {
        llmVerdict: judgment.verdict,
        llmReason: judgment.reason,
        llmRuleIds: JSON.stringify(judgment.ruleIds),
        llmRaw: JSON.stringify(judgment),
        llmStatus: 'done',
        llmAttemptId: null,
      }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'LLM 호출 실패'
    const repo = await getAdRequestRepo()
    await repo.update(
      { id: adRequestId, llmStatus: 'processing', llmAttemptId },
      {
        llmVerdict: 'error',
        llmReason: message,
        llmRuleIds: JSON.stringify([]),
        llmRaw: JSON.stringify({ error: message }),
        llmStatus: 'failed',
        llmAttemptId: null,
      }
    )
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit(ip, 'submit')
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const parsed = adSubmitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다' } },
        { status: 400 }
      )
    }

    const requestCode = generateRequestCode()
    const llmAttemptId = randomUUID()
    const policyVersion = await getPolicyVersion()
    const applicantEmail = parsed.data.applicantContact.trim().toLowerCase()
    const derivedTitle =
      parsed.data.contentBody
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0)
        ?.slice(0, 200) || '오픈채팅 광고 메시지'

    const repo = await getAdRequestRepo()
    const adRequest = repo.create({
      requestCode,
      applicantName: parsed.data.applicantName,
      applicantContact: applicantEmail,
      contentType: parsed.data.contentType,
      contentTitle: derivedTitle,
      contentBody: parsed.data.contentBody,
      contentUrl: parsed.data.contentUrl || null,
      llmVerdict: null,
      llmReason: null,
      llmRuleIds: null,
      llmRaw: null,
      llmStatus: 'processing',
      llmAttemptId,
      policyVersion,
      status: 'pending',
    })
    const saved = await repo.save(adRequest)

    void runAsyncJudgment(saved.id, llmAttemptId, {
      contentType: parsed.data.contentType,
      contentBody: parsed.data.contentBody,
      contentUrl: parsed.data.contentUrl || undefined,
    })

    return NextResponse.json({
      requestCode,
      llmStatus: 'processing',
      message: '광고 심사 요청이 접수되었습니다. 요청코드 또는 입력하신 이메일 주소로 심사 현황을 조회할 수 있습니다.',
    }, { status: 201 })
  } catch (error) {
    console.error('Submit error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
