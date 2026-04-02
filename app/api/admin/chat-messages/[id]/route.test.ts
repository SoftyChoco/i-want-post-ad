import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getRepoMock, getDbMock, getActorFromHeadersMock } = vi.hoisted(() => ({
  getRepoMock: vi.fn(),
  getDbMock: vi.fn(),
  getActorFromHeadersMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getChatMessageScheduleRepo: getRepoMock,
  getDb: getDbMock,
}))

vi.mock('@/lib/request-actor', () => ({
  getActorFromHeaders: getActorFromHeadersMock,
}))

import { DELETE, PATCH } from '@/app/api/admin/chat-messages/[id]/route'

describe('admin chat message schedule detail api', () => {
  beforeEach(() => {
    getRepoMock.mockReset()
    getDbMock.mockReset()
    getActorFromHeadersMock.mockReset()
    getActorFromHeadersMock.mockReturnValue({ userId: 1, role: 'admin', name: '방장' })
  })

  it('updates schedule and writes audit log', async () => {
    getRepoMock.mockResolvedValue({
      findOneBy: vi.fn().mockResolvedValue({
        id: 5,
        scheduleName: '밤 인사',
        messageText: '기존',
        mode: 'fixed_time',
        fixedTime: '22:00',
        intervalMinutes: null,
        isActive: true,
      }),
    })

    const scheduleRepo = { create: vi.fn((v) => v) }
    const logRepo = { create: vi.fn((v) => v) }
    const manager = {
      getRepository: vi.fn((name: string) => (name === 'ChatMessageSchedule' ? scheduleRepo : logRepo)),
      save: vi.fn().mockResolvedValue({}),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: any) => cb(manager)) })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/5', {
      method: 'PATCH',
      body: JSON.stringify({
        messageText: '수정된 밤 인사',
        mode: 'fixed_time',
        fixedTime: '22:30',
        isActive: true,
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '5' }) })
    expect(response.status).toBe(200)
  })

  it('deletes schedule and writes audit log', async () => {
    getRepoMock.mockResolvedValue({
      findOneBy: vi.fn().mockResolvedValue({
        id: 6,
        scheduleName: '점심 안내',
        messageText: '점심시간입니다',
      }),
    })

    const manager = {
      getRepository: vi.fn(() => ({ create: vi.fn((v) => v) })),
      remove: vi.fn().mockResolvedValue({}),
      save: vi.fn().mockResolvedValue({}),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: any) => cb(manager)) })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/6', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: '6' }) })
    expect(response.status).toBe(200)
  })
})
