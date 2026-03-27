import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { lessThanMock, getAdRequestRepoMock } = vi.hoisted(() => ({
  lessThanMock: vi.fn((value: Date) => ({ op: 'lt', value })),
  getAdRequestRepoMock: vi.fn(),
}))

vi.mock('typeorm', () => ({
  LessThan: lessThanMock,
}))

vi.mock('@/lib/db', () => ({
  getAdRequestRepo: getAdRequestRepoMock,
}))

import {
  LLM_PROCESSING_TIMEOUT_MS,
  LLM_STALE_PROCESSING_REASON,
  recoverStaleLlmProcessing,
  resolveLlmStatus,
} from '@/lib/llm-status'

describe('resolveLlmStatus', () => {
  it('returns explicit status when valid and verdict is absent', () => {
    expect(resolveLlmStatus('processing', null)).toBe('processing')
    expect(resolveLlmStatus('done', null)).toBe('done')
    expect(resolveLlmStatus('failed', null)).toBe('failed')
  })

  it('normalizes processing status when verdict already exists', () => {
    expect(resolveLlmStatus('processing', 'compliant')).toBe('done')
    expect(resolveLlmStatus('processing', 'non_compliant')).toBe('done')
    expect(resolveLlmStatus('processing', 'error')).toBe('failed')
  })

  it('falls back from legacy values based on verdict', () => {
    expect(resolveLlmStatus(undefined, null)).toBe('processing')
    expect(resolveLlmStatus(null, 'error')).toBe('failed')
    expect(resolveLlmStatus('legacy-value', 'needs_review')).toBe('done')
  })
})

describe('recoverStaleLlmProcessing', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-27T00:00:00.000Z'))
    lessThanMock.mockReset()
    getAdRequestRepoMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates stale processing rows and returns affected count', async () => {
    const updateMock = vi.fn().mockResolvedValue({ affected: 2 })
    getAdRequestRepoMock.mockResolvedValue({ update: updateMock })

    const affected = await recoverStaleLlmProcessing()

    const expectedThreshold = new Date(Date.now() - LLM_PROCESSING_TIMEOUT_MS)
    expect(affected).toBe(2)
    expect(lessThanMock).toHaveBeenCalledWith(expectedThreshold)
    expect(updateMock).toHaveBeenCalledWith(
      {
        llmStatus: 'processing',
        updatedAt: { op: 'lt', value: expectedThreshold },
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
  })

  it('returns zero when no stale rows were updated', async () => {
    const updateMock = vi.fn().mockResolvedValue({ affected: undefined })
    getAdRequestRepoMock.mockResolvedValue({ update: updateMock })

    await expect(recoverStaleLlmProcessing()).resolves.toBe(0)
  })
})
