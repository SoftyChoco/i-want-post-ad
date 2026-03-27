import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { recoverStaleLlmProcessingMock } = vi.hoisted(() => ({
  recoverStaleLlmProcessingMock: vi.fn(),
}))

vi.mock('@/lib/llm-status', () => ({
  recoverStaleLlmProcessing: recoverStaleLlmProcessingMock,
}))

import { POST } from '@/app/api/internal/maintenance/recover-llm/route'

describe('POST /api/internal/maintenance/recover-llm', () => {
  beforeEach(() => {
    recoverStaleLlmProcessingMock.mockReset()
    delete process.env.INTERNAL_MAINTENANCE_TOKEN
  })

  it('returns 500 when token is not configured', async () => {
    const request = new NextRequest('http://localhost:3000/api/internal/maintenance/recover-llm', {
      method: 'POST',
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'MISCONFIGURED',
        message: 'INTERNAL_MAINTENANCE_TOKEN is not configured',
      },
    })
  })

  it('returns 403 for missing or invalid token', async () => {
    process.env.INTERNAL_MAINTENANCE_TOKEN = 'valid-token'

    const missingAuth = new NextRequest('http://localhost:3000/api/internal/maintenance/recover-llm', {
      method: 'POST',
    })
    const invalidAuth = new NextRequest('http://localhost:3000/api/internal/maintenance/recover-llm', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-token' },
    })

    const missingResponse = await POST(missingAuth)
    const invalidResponse = await POST(invalidAuth)

    expect(missingResponse.status).toBe(403)
    expect(invalidResponse.status).toBe(403)
  })

  it('returns recovered count when token is valid', async () => {
    process.env.INTERNAL_MAINTENANCE_TOKEN = 'valid-token'
    recoverStaleLlmProcessingMock.mockResolvedValue(4)

    const request = new NextRequest('http://localhost:3000/api/internal/maintenance/recover-llm', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ recovered: 4 })
    expect(recoverStaleLlmProcessingMock).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when recovery fails', async () => {
    process.env.INTERNAL_MAINTENANCE_TOKEN = 'valid-token'
    recoverStaleLlmProcessingMock.mockRejectedValue(new Error('db unavailable'))

    const request = new NextRequest('http://localhost:3000/api/internal/maintenance/recover-llm', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 오류가 발생했습니다',
      },
    })
  })
})
