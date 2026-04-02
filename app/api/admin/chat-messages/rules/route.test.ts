import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getRepoMock, getDbMock, getActorFromHeadersMock } = vi.hoisted(() => ({
  getRepoMock: vi.fn(),
  getDbMock: vi.fn(),
  getActorFromHeadersMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getChatMessageTriggerRuleRepo: getRepoMock,
  getDb: getDbMock,
}))

vi.mock('@/lib/request-actor', () => ({
  getActorFromHeaders: getActorFromHeadersMock,
}))

import { GET, POST } from '@/app/api/admin/chat-messages/rules/route'

describe('admin chat message trigger rules api', () => {
  beforeEach(() => {
    getRepoMock.mockReset()
    getDbMock.mockReset()
    getActorFromHeadersMock.mockReset()
  })

  it('allows moderator to create trigger rule and writes audit log', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 2, role: 'moderator', name: '부방장' })

    const ruleRepo = { create: vi.fn((v) => v) }
    const logRepo = { create: vi.fn((v) => v) }
    const manager = {
      getRepository: vi.fn((target: string | { name?: string }) => (target === 'ChatMessageTriggerRule' || (typeof target !== 'string' && target.name === 'ChatMessageTriggerRule') ? ruleRepo : logRepo)),
      save: vi
        .fn()
        .mockResolvedValueOnce({
          id: 7,
          ruleName: '문의 자동응답',
          keyword: '문의',
          authorName: null,
          responseText: '문의는 /submit 이용해주세요',
          isActive: true,
          lastMatchedEventId: null,
        })
        .mockResolvedValueOnce({}),
    }

    getDbMock.mockResolvedValue({
      transaction: vi.fn(async (cb: (m: typeof manager) => Promise<void>) => cb(manager)),
    })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/rules', {
      method: 'POST',
      body: JSON.stringify({
        ruleName: '문의 자동응답',
        keyword: '문의',
        responseText: '문의는 /submit 이용해주세요',
        isActive: true,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      data: {
        ruleName: '문의 자동응답',
        keyword: '문의',
      },
    })
  })

  it('forbids non-admin/moderator role', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 9, role: 'viewer', name: 'x' })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/rules', {
      method: 'GET',
    })
    const response = await GET(request)

    expect(response.status).toBe(403)
  })

  it('lists trigger rules for moderator', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 2, role: 'moderator', name: '부방장' })
    getRepoMock.mockResolvedValue({
      find: vi.fn().mockResolvedValue([
        {
          id: 1,
          ruleName: '신청 가이드',
          keyword: '신청',
          responseText: '신청은 /submit',
          isActive: true,
        },
      ]),
    })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/rules', { method: 'GET' })
    const response = await GET(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ data: [{ ruleName: '신청 가이드' }] })
  })

  it('returns empty list when trigger metadata is unavailable', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 2, role: 'moderator', name: '부방장' })
    const metadataError = Object.assign(new Error('No metadata'), { name: 'EntityMetadataNotFoundError' })
    getRepoMock.mockRejectedValue(metadataError)

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/rules', { method: 'GET' })
    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ data: [] })
  })
})
