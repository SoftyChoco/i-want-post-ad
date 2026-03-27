import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getAdRequestRepoMock, checkRateLimitMock, getClientIpMock, resolveLlmStatusMock } = vi.hoisted(() => ({
  getAdRequestRepoMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
  resolveLlmStatusMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getAdRequestRepo: getAdRequestRepoMock,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: getClientIpMock,
}))

vi.mock('@/lib/llm-status', () => ({
  resolveLlmStatus: resolveLlmStatusMock,
}))

import { GET } from '@/app/api/requests/by-contact/route'

describe('GET /api/requests/by-contact', () => {
  beforeEach(() => {
    checkRateLimitMock.mockReturnValue({ allowed: true })
    getClientIpMock.mockReturnValue('127.0.0.1')
    resolveLlmStatusMock.mockReturnValue('done')
    getAdRequestRepoMock.mockReset()
  })

  it('returns 400 when lookup query is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/requests/by-contact')
    const response = await GET(request)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'MISSING_PARAM', message: '이메일 주소 또는 요청코드를 입력해주세요' },
    })
  })

  it('returns 400 when query is neither email nor request code', async () => {
    const request = new NextRequest('http://localhost:3000/api/requests/by-contact?query=invalid-value')
    const response = await GET(request)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'INVALID_PARAM', message: '올바른 이메일 주소 또는 요청코드를 입력해주세요' },
    })
  })

  it('looks up by email when query is email', async () => {
    const findMock = vi.fn().mockResolvedValue([
      {
        requestCode: 'REQ-20260327-ABCD',
        applicantName: 'tester',
        applicantContact: 'user@example.com',
        contentType: '교육/강의',
        contentBody: '본문',
        contentUrl: null,
        llmStatus: 'done',
        llmVerdict: 'compliant',
        llmReason: 'ok',
        status: 'pending',
        createdAt: new Date('2026-03-27T00:00:00.000Z'),
        reviewedAt: null,
        adminReason: null,
      },
    ])
    getAdRequestRepoMock.mockResolvedValue({ find: findMock })

    const request = new NextRequest('http://localhost:3000/api/requests/by-contact?query=User@Example.com')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(findMock).toHaveBeenCalledWith({
      where: { applicantContact: 'user@example.com' },
      order: { createdAt: 'DESC' },
      take: 20,
    })
    expect(body.data).toHaveLength(1)
    expect(body.data[0].requestCode).toBe('REQ-20260327-ABCD')
  })

  it('looks up by request code when query is REQ code', async () => {
    const findMock = vi.fn().mockResolvedValue([])
    getAdRequestRepoMock.mockResolvedValue({ find: findMock })

    const request = new NextRequest('http://localhost:3000/api/requests/by-contact?query=req-20260327-abcd')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(findMock).toHaveBeenCalledWith({
      where: { requestCode: 'REQ-20260327-ABCD' },
      order: { createdAt: 'DESC' },
      take: 1,
    })
  })

  it('returns 429 when rate limit exceeded', async () => {
    checkRateLimitMock.mockReturnValue({ allowed: false, retryAfterMs: 2000 })
    const request = new NextRequest('http://localhost:3000/api/requests/by-contact?query=user@example.com')
    const response = await GET(request)

    expect(response.status).toBe(429)
  })
})
