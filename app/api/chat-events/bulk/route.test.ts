import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getBatchRepoMock, getDbMock } = vi.hoisted(() => ({
  getBatchRepoMock: vi.fn(),
  getDbMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getChatEventBatchRepo: getBatchRepoMock,
  getDb: getDbMock,
}))

import { POST } from '@/app/api/chat-events/bulk/route'

describe('POST /api/chat-events/bulk', () => {
  beforeEach(() => {
    delete process.env.KAKAO_BOT_TOKEN
    getBatchRepoMock.mockReset()
    getDbMock.mockReset()
  })

  it('returns 500 when bot token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat-events/bulk', {
      method: 'POST',
      body: JSON.stringify({ events: [] }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })

  it('returns 403 when token is invalid', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'
    const request = new NextRequest('http://localhost:3000/api/chat-events/bulk', {
      method: 'POST',
      headers: { authorization: 'Bearer invalid' },
      body: JSON.stringify({ events: [] }),
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('returns 400 when Idempotency-Key is missing', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'
    const request = new NextRequest('http://localhost:3000/api/chat-events/bulk', {
      method: 'POST',
      headers: { authorization: 'Bearer bot-token' },
      body: JSON.stringify({
        events: [
          {
            observedAt: '2026-04-03T10:15:30.123Z',
            authorName: '@softycho.co',
            content: '안녕하세요',
          },
        ],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('stores batch atomically and returns accepted count', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'
    getBatchRepoMock.mockResolvedValue({ findOneBy: vi.fn().mockResolvedValue(null) })

    const batchTxRepo = { create: vi.fn((v) => v) }
    const eventTxRepo = { create: vi.fn((v) => v) }
    const manager = {
      getRepository: vi.fn((target: string | { name?: string }) => {
        if (target === 'ChatEventBatch' || (typeof target !== 'string' && target.name === 'ChatEventBatch')) return batchTxRepo
        return eventTxRepo
      }),
      save: vi.fn()
        .mockResolvedValueOnce({ id: 101, idempotencyKey: 'batch-1', accepted: 2 })
        .mockResolvedValueOnce([{}, {}]),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: (m: typeof manager) => Promise<void>) => cb(manager)) })

    const request = new NextRequest('http://localhost:3000/api/chat-events/bulk', {
      method: 'POST',
      headers: {
        authorization: 'Bearer bot-token',
        'idempotency-key': 'batch-1',
      },
      body: JSON.stringify({
        events: [
          { observedAt: '2026-04-03T10:15:30.123Z', authorName: '@a', content: '1' },
          { observedAt: '2026-04-03T10:15:31.123Z', authorName: '@b', content: '2' },
        ],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ accepted: 2 })
  })

  it('returns same result for duplicate Idempotency-Key', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'
    getBatchRepoMock.mockResolvedValue({
      findOneBy: vi.fn().mockResolvedValue({ id: 9, idempotencyKey: 'batch-dup', accepted: 3 }),
    })

    const request = new NextRequest('http://localhost:3000/api/chat-events/bulk', {
      method: 'POST',
      headers: {
        authorization: 'Bearer bot-token',
        'idempotency-key': 'batch-dup',
      },
      body: JSON.stringify({
        events: [
          { observedAt: '2026-04-03T10:15:30.123Z', authorName: '@a', content: '1' },
        ],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ accepted: 3 })
  })
})
