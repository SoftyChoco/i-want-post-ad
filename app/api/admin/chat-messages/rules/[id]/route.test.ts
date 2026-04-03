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

import { DELETE, PATCH } from '@/app/api/admin/chat-messages/rules/[id]/route'

describe('admin chat message trigger rule detail api', () => {
  beforeEach(() => {
    getRepoMock.mockReset()
    getDbMock.mockReset()
    getActorFromHeadersMock.mockReset()
    getActorFromHeadersMock.mockReturnValue({ userId: 1, role: 'admin', name: '방장' })
  })

  it('updates trigger rule and writes audit log', async () => {
    getRepoMock.mockResolvedValue({
      findOneBy: vi.fn().mockResolvedValue({
        id: 5,
        ruleName: '문의 자동응답',
        keyword: '문의',
        authorName: null,
        responseText: '기존 메시지',
        isActive: true,
      }),
    })

    const manager = {
      getRepository: vi.fn(() => ({ create: vi.fn((v) => v) })),
      save: vi.fn().mockResolvedValue({}),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: any) => cb(manager)) })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/rules/5', {
      method: 'PATCH',
      body: JSON.stringify({
        responseText: '수정된 안내 메시지',
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '5' }) })
    expect(response.status).toBe(200)
  })

  it('clears authorName when null is provided', async () => {
    getRepoMock.mockResolvedValue({
      findOneBy: vi.fn().mockResolvedValue({
        id: 8,
        ruleName: '작성자 조건 룰',
        keyword: '문의',
        authorName: '기존닉네임',
        responseText: '안내',
        isActive: true,
      }),
    })

    const manager = {
      getRepository: vi.fn(() => ({ create: vi.fn((v) => v) })),
      save: vi.fn().mockResolvedValue({}),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: any) => cb(manager)) })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/rules/8', {
      method: 'PATCH',
      body: JSON.stringify({
        authorName: null,
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '8' }) })
    expect(response.status).toBe(200)
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ChatMessageTriggerRule' }),
      expect.objectContaining({ authorName: null })
    )
  })

  it('deletes trigger rule and writes audit log', async () => {
    getRepoMock.mockResolvedValue({
      findOneBy: vi.fn().mockResolvedValue({
        id: 6,
        ruleName: '삭제 대상 룰',
      }),
    })

    const manager = {
      getRepository: vi.fn(() => ({ create: vi.fn((v) => v) })),
      remove: vi.fn().mockResolvedValue({}),
      save: vi.fn().mockResolvedValue({}),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: any) => cb(manager)) })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/rules/6', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: '6' }) })
    expect(response.status).toBe(200)
  })
})
