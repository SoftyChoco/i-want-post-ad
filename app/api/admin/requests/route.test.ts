import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getAdRequestRepoMock, checkRateLimitMock, getClientIpMock } = vi.hoisted(() => ({
  getAdRequestRepoMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getAdRequestRepo: getAdRequestRepoMock,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: getClientIpMock,
}))

import { GET } from '@/app/api/admin/requests/route'

describe('GET /api/admin/requests', () => {
  beforeEach(() => {
    checkRateLimitMock.mockReturnValue({ allowed: true })
    getClientIpMock.mockReturnValue('127.0.0.1')
    getAdRequestRepoMock.mockReset()
  })

  it('returns 429 when admin read rate limit is exceeded', async () => {
    checkRateLimitMock.mockReturnValue({ allowed: false, retryAfterMs: 1200 })
    const request = new NextRequest('http://localhost:3000/api/admin/requests')
    const response = await GET(request)

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '조회 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      },
    })
  })

  it('returns request data when rate limit allows', async () => {
    const findAndCountMock = vi.fn().mockResolvedValue([[], 0])
    getAdRequestRepoMock.mockResolvedValue({ findAndCount: findAndCountMock })

    const request = new NextRequest('http://localhost:3000/api/admin/requests?status=all')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.meta.total).toBe(0)
    expect(findAndCountMock).toHaveBeenCalledTimes(1)
  })
})
