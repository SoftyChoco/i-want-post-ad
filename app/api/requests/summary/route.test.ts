import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getAdRequestRepoMock } = vi.hoisted(() => ({
  getAdRequestRepoMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getAdRequestRepo: getAdRequestRepoMock,
}))

import { GET } from '@/app/api/requests/summary/route'

describe('GET /api/requests/summary', () => {
  beforeEach(() => {
    delete process.env.EXTERNAL_API_TOKEN
    delete process.env.KAKAO_BOT_TOKEN
    getAdRequestRepoMock.mockReset()
  })

  it('returns 500 when external token is not configured', async () => {
    const request = new NextRequest('http://localhost:3000/api/requests/summary')
    const response = await GET(request)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'MISCONFIGURED', message: 'EXTERNAL_API_TOKEN is not configured' },
    })
  })

  it('returns 403 when token is invalid', async () => {
    process.env.EXTERNAL_API_TOKEN = 'external-token'
    const request = new NextRequest('http://localhost:3000/api/requests/summary', {
      headers: { authorization: 'Bearer wrong-token' },
    })

    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it('returns pending and status summary when token is valid', async () => {
    process.env.EXTERNAL_API_TOKEN = 'external-token'
    const countByMock = vi
      .fn()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
    getAdRequestRepoMock.mockResolvedValue({ countBy: countByMock })

    const request = new NextRequest('http://localhost:3000/api/requests/summary', {
      headers: { authorization: 'Bearer external-token' },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      hasPending: true,
      pendingCount: 2,
      statusCounts: {
        pending: 2,
        approved: 10,
        rejected: 3,
      },
    })
  })

  it('supports legacy KAKAO_BOT_TOKEN as fallback', async () => {
    process.env.KAKAO_BOT_TOKEN = 'legacy-token'
    getAdRequestRepoMock.mockResolvedValue({
      countBy: vi.fn().mockResolvedValue(0),
    })

    const request = new NextRequest('http://localhost:3000/api/requests/summary', {
      headers: { authorization: 'Bearer legacy-token' },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
  })
})
