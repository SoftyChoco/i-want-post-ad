import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getAdRequestRepoMock, getDbMock, checkRateLimitMock, getClientIpMock } = vi.hoisted(() => ({
  getAdRequestRepoMock: vi.fn(),
  getDbMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getAdRequestRepo: getAdRequestRepoMock,
  getDb: getDbMock,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: getClientIpMock,
}))

import { GET } from '@/app/api/admin/requests/[id]/route'

describe('GET /api/admin/requests/[id]', () => {
  beforeEach(() => {
    checkRateLimitMock.mockReturnValue({ allowed: true })
    getClientIpMock.mockReturnValue('127.0.0.1')
    getAdRequestRepoMock.mockReset()
  })

  it('returns 429 when admin read rate limit is exceeded', async () => {
    checkRateLimitMock.mockReturnValue({ allowed: false, retryAfterMs: 1200 })

    const request = new NextRequest('http://localhost:3000/api/admin/requests/1')
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '조회 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      },
    })
  })

  it('returns 404 when request does not exist', async () => {
    const findOneMock = vi.fn().mockResolvedValue(null)
    getAdRequestRepoMock.mockResolvedValue({ findOne: findOneMock })

    const request = new NextRequest('http://localhost:3000/api/admin/requests/999')
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) })

    expect(response.status).toBe(404)
  })
})
