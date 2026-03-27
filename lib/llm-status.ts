import { LessThan } from 'typeorm'
import { getAdRequestRepo } from '@/lib/db'

export const LLM_PROCESSING_TIMEOUT_MS = 70_000
export const LLM_STALE_PROCESSING_REASON = 'AI 판정이 지연되어 실패 처리되었습니다. 재판정을 실행해 주세요.'

export function resolveLlmStatus(
  llmStatus: string | null | undefined,
  llmVerdict: string | null | undefined
): 'processing' | 'done' | 'failed' {
  if (llmStatus === 'done' || llmStatus === 'failed' || llmStatus === 'processing') {
    if (llmStatus === 'processing' && llmVerdict) {
      return llmVerdict === 'error' ? 'failed' : 'done'
    }
    return llmStatus
  }

  if (!llmVerdict) return 'processing'
  return llmVerdict === 'error' ? 'failed' : 'done'
}

export async function recoverStaleLlmProcessing(): Promise<number> {
  const repo = await getAdRequestRepo()
  const threshold = new Date(Date.now() - LLM_PROCESSING_TIMEOUT_MS)

  const result = await repo.update(
    {
      llmStatus: 'processing',
      updatedAt: LessThan(threshold),
    },
    {
      llmStatus: 'failed',
      llmVerdict: 'error',
      llmReason: LLM_STALE_PROCESSING_REASON,
      llmRuleIds: JSON.stringify([]),
      llmRaw: JSON.stringify({ error: 'LLM background job timed out' }),
      llmAttemptId: null,
    }
  )

  return result.affected || 0
}
