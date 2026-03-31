import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

import { GET } from '@/app/api/verify/route'

describe('GET /api/verify', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = 'external-token'
    delete process.env.KAKAO_BOT_TOKEN
    checkRateLimitMock.mockReset()
    getClientIpMock.mockReset()
    getClientIpMock.mockReturnValue('127.0.0.1')
    checkRateLimitMock.mockReturnValue({ allowed: true })
    getAdRequestRepoMock.mockReset()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-28T00:00:00.000Z'))
  })

  afterEach(() => {
    delete process.env.EXTERNAL_API_TOKEN
    vi.useRealTimers()
  })

  it('returns 410 when approved request code is older than 24 hours', async () => {
    const findOneMock = vi.fn().mockResolvedValue({
      requestCode: 'REQ-20260327-ABCD',
      status: 'approved',
      reviewedAt: new Date('2026-03-26T20:00:00.000Z'),
      reviewedBy: { name: 'Admin' },
      contentTitle: 't',
      contentType: '교육/강의',
    })
    getAdRequestRepoMock.mockResolvedValue({ findOne: findOneMock })

    const request = new NextRequest('http://localhost:3000/api/verify?requestCode=REQ-20260327-ABCD')
    const response = await GET(request)

    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'EXPIRED',
        message: '요청코드 유효기간(24시간)이 만료되었습니다',
      },
    })
  })

  it('returns valid true for approved request code within 24 hours', async () => {
    const findOneMock = vi.fn().mockResolvedValue({
      requestCode: 'REQ-20260327-ABCD',
      status: 'approved',
      reviewedAt: new Date('2026-03-27T20:30:00.000Z'),
      reviewedBy: { name: 'Admin' },
      contentTitle: 't',
      contentType: '교육/강의',
    })
    getAdRequestRepoMock.mockResolvedValue({ findOne: findOneMock })

    const request = new NextRequest('http://localhost:3000/api/verify?requestCode=REQ-20260327-ABCD')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.valid).toBe(true)
    expect(body.requestCode).toBe('REQ-20260327-ABCD')
  })

  it('bypasses rate limit when valid bot token is provided', async () => {
    checkRateLimitMock.mockReturnValue({ allowed: false, retryAfterMs: 5000 })
    const findOneMock = vi.fn().mockResolvedValue({
      requestCode: 'REQ-20260327-ABCD',
      status: 'approved',
      reviewedAt: new Date('2026-03-27T20:30:00.000Z'),
      reviewedBy: { name: 'Admin' },
      contentTitle: 't',
      contentType: '교육/강의',
    })
    getAdRequestRepoMock.mockResolvedValue({ findOne: findOneMock })

    const request = new NextRequest('http://localhost:3000/api/verify?requestCode=REQ-20260327-ABCD', {
      headers: { authorization: 'Bearer external-token' },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'approved',
      expired: false,
      reviewedAt: '2026-03-27T20:30:00.000Z',
    })
    expect(checkRateLimitMock).not.toHaveBeenCalled()
  })

  it('returns pending status for unreviewed request when token is valid', async () => {
    const findOneMock = vi.fn().mockResolvedValue({
      requestCode: 'REQ-20260327-ABCD',
      status: 'pending',
      reviewedAt: null,
      reviewedBy: null,
      contentTitle: 't',
      contentType: '교육/강의',
    })
    getAdRequestRepoMock.mockResolvedValue({ findOne: findOneMock })

    const request = new NextRequest('http://localhost:3000/api/verify?requestCode=REQ-20260327-ABCD', {
      headers: { authorization: 'Bearer external-token' },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'pending',
      expired: false,
      reviewedAt: null,
    })
  })

  it('returns rejected status when request was rejected', async () => {
    const findOneMock = vi.fn().mockResolvedValue({
      requestCode: 'REQ-20260327-ABCD',
      status: 'rejected',
      reviewedAt: new Date('2026-03-27T19:00:00.000Z'),
      reviewedBy: { name: 'Admin' },
      contentTitle: 't',
      contentType: '교육/강의',
    })
    getAdRequestRepoMock.mockResolvedValue({ findOne: findOneMock })

    const request = new NextRequest('http://localhost:3000/api/verify?requestCode=REQ-20260327-ABCD', {
      headers: { authorization: 'Bearer external-token' },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'rejected',
      expired: false,
      reviewedAt: '2026-03-27T19:00:00.000Z',
    })
  })
})
