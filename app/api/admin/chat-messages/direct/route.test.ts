import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getDbMock, getActorFromHeadersMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  getActorFromHeadersMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getDb: getDbMock,
}))

vi.mock('@/lib/request-actor', () => ({
  getActorFromHeaders: getActorFromHeadersMock,
}))

import { POST } from '@/app/api/admin/chat-messages/direct/route'

describe('admin direct chat message api', () => {
  beforeEach(() => {
    getDbMock.mockReset()
    getActorFromHeadersMock.mockReset()
  })

  it('creates a direct message for admin or moderator', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 2, role: 'moderator', name: '부방장' })

    const directRepo = { create: vi.fn((v) => v) }
    const logRepo = { create: vi.fn((v) => v) }
    const manager = {
      getRepository: vi.fn((target: string | { name?: string }) => (target === 'ChatMessageDirect' || (typeof target !== 'string' && target.name === 'ChatMessageDirect') ? directRepo : logRepo)),
      save: vi
        .fn()
        .mockResolvedValueOnce({ id: 31, messageText: '즉시 공지 테스트', createdByName: '부방장', dispatchedAt: null })
        .mockResolvedValueOnce({}),
    }

    getDbMock.mockResolvedValue({
      transaction: vi.fn(async (cb: (m: typeof manager) => Promise<void>) => cb(manager)),
    })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/direct', {
      method: 'POST',
      body: JSON.stringify({ messageText: '즉시 공지 테스트' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      data: { id: 31, messageText: '즉시 공지 테스트', dispatchedAt: null },
    })
  })

  it('forbids non-admin/moderator role', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 9, role: 'viewer', name: 'x' })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/direct', {
      method: 'POST',
      body: JSON.stringify({ messageText: '테스트' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(403)
  })
})
