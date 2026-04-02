import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getAdRequestRepo, getDb } from '@/lib/db'
import { judgeAdContent } from '@/lib/llm'
import { recoverStaleLlmProcessing } from '@/lib/llm-status'
import { getPolicyVersion } from '@/lib/policy'
import { getActorFromHeaders } from '@/lib/request-actor'
import { AdRequest } from '@/lib/entities/AdRequest'
import { AuditLog } from '@/lib/entities/AuditLog'

const REJUDGE_PROCESSING_MESSAGE = '재판정 진행중입니다. 최대 1분 내 결과가 반영됩니다.'

async function runAsyncRejudge(input: {
  requestId: number
  requestCode: string
  llmAttemptId: string
  contentType: string
  contentBody: string
  contentUrl?: string
  previousVerdict: string | null
  previousReason: string | null
  actorId: number
  actorName: string
}) {
  try {
    const policyVersion = await getPolicyVersion()
    const judgment = await judgeAdContent({
      contentType: input.contentType,
      contentBody: input.contentBody,
      contentUrl: input.contentUrl,
    })

    const db = await getDb()
    await db.transaction(async (manager) => {
      await manager.getRepository(AdRequest).update(
        { id: input.requestId, llmStatus: 'processing', llmAttemptId: input.llmAttemptId },
        {
          llmVerdict: judgment.verdict,
          llmReason: judgment.reason,
          llmRuleIds: JSON.stringify(judgment.ruleIds),
          llmRaw: JSON.stringify(judgment),
          llmStatus: 'done',
          llmAttemptId: null,
          policyVersion,
        }
      )

      const log = manager.getRepository(AuditLog).create({
        action: 'rejudge',
        targetType: 'ad_request',
        targetId: input.requestId,
        actorId: input.actorId,
        actorName: input.actorName,
        details: JSON.stringify({
          stage: 'completed',
          requestCode: input.requestCode,
          previousVerdict: input.previousVerdict,
          previousReason: input.previousReason,
          nextVerdict: judgment.verdict,
          nextReason: judgment.reason,
        }),
      })
      await manager.save(AuditLog, log)
    })
  } catch (error: unknown) {
    const policyVersion = await getPolicyVersion()
    const message = error instanceof Error ? error.message : 'LLM 재판정 실패'
    const db = await getDb()
    await db.transaction(async (manager) => {
      await manager.getRepository(AdRequest).update(
        { id: input.requestId, llmStatus: 'processing', llmAttemptId: input.llmAttemptId },
        {
          llmVerdict: 'error',
          llmReason: message,
          llmRuleIds: JSON.stringify([]),
          llmRaw: JSON.stringify({ error: message }),
          llmStatus: 'failed',
          llmAttemptId: null,
          policyVersion,
        }
      )

      const log = manager.getRepository(AuditLog).create({
        action: 'rejudge',
        targetType: 'ad_request',
        targetId: input.requestId,
        actorId: input.actorId,
        actorName: input.actorName,
        details: JSON.stringify({
          stage: 'failed',
          requestCode: input.requestCode,
          previousVerdict: input.previousVerdict,
          previousReason: input.previousReason,
          error: message,
        }),
      })
      await manager.save(AuditLog, log)
    })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = getActorFromHeaders(request.headers)
    const role = actor.role
    if (role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장만 재판정을 실행할 수 있습니다' } },
        { status: 403 }
      )
    }

    const userId = actor.userId
    const userName = actor.name
    const { id } = await params

    await recoverStaleLlmProcessing()

    const repo = await getAdRequestRepo()
    const adRequest = await repo.findOne({ where: { id: Number(id) } })

    if (!adRequest) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '요청을 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    if (adRequest.llmStatus === 'processing') {
      return NextResponse.json(
        { error: { code: 'ALREADY_REJUDGING', message: '이미 재판정이 진행 중입니다' } },
        { status: 409 }
      )
    }

    const previousVerdict = adRequest.llmVerdict
    const previousReason = adRequest.llmReason
    const llmAttemptId = randomUUID()
    const policyVersion = await getPolicyVersion()
    const db = await getDb()
    await db.transaction(async (manager) => {
      adRequest.llmVerdict = null
      adRequest.llmReason = REJUDGE_PROCESSING_MESSAGE
      adRequest.llmRuleIds = null
      adRequest.llmRaw = null
      adRequest.llmStatus = 'processing'
      adRequest.llmAttemptId = llmAttemptId
      adRequest.policyVersion = policyVersion
      await manager.save(AdRequest, adRequest)

      const log = manager.getRepository(AuditLog).create({
        action: 'rejudge',
        targetType: 'ad_request',
        targetId: adRequest.id,
        actorId: userId,
        actorName: userName,
        details: JSON.stringify({
          stage: 'requested',
          requestCode: adRequest.requestCode,
          previousVerdict,
          previousReason,
        }),
      })
      await manager.save(AuditLog, log)
    })

    void runAsyncRejudge({
      requestId: adRequest.id,
      requestCode: adRequest.requestCode,
      llmAttemptId,
      contentType: adRequest.contentType,
      contentBody: adRequest.contentBody,
      contentUrl: adRequest.contentUrl || undefined,
      previousVerdict,
      previousReason,
      actorId: userId,
      actorName: userName,
    })

    return NextResponse.json({
      requestCode: adRequest.requestCode,
      llmStatus: 'processing',
      message: REJUDGE_PROCESSING_MESSAGE,
    }, { status: 202 })
  } catch (error) {
    console.error('Admin rejudge error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
