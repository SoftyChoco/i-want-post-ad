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

import { GET, POST } from '@/app/api/admin/chat-messages/route'

describe('admin chat message schedules api', () => {
  beforeEach(() => {
    getRepoMock.mockReset()
    getDbMock.mockReset()
    getActorFromHeadersMock.mockReset()
  })

  it('allows moderator to create schedule and writes audit log', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 2, role: 'moderator', name: '부방장' })

    const scheduleRepo = { create: vi.fn((v) => v) }
    const logRepo = { create: vi.fn((v) => v) }
    const manager = {
      getRepository: vi.fn((target: string | { name?: string }) => (target === 'ChatMessageSchedule' || (typeof target !== 'string' && target.name === 'ChatMessageSchedule') ? scheduleRepo : logRepo)),
      save: vi
        .fn()
        .mockResolvedValueOnce({
          id: 7,
          scheduleName: '공지 스케줄',
          messageText: '공지 메시지',
          mode: 'interval',
          intervalMinutes: 30,
          fixedTime: null,
          isActive: true,
        })
        .mockResolvedValueOnce({}),
    }

    getDbMock.mockResolvedValue({
      transaction: vi.fn(async (cb: (m: typeof manager) => Promise<void>) => cb(manager)),
    })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages', {
      method: 'POST',
      body: JSON.stringify({
        scheduleName: '공지 스케줄',
        messageText: '공지 메시지',
        mode: 'interval',
        intervalMinutes: 30,
        isActive: true,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      data: {
        scheduleName: '공지 스케줄',
        mode: 'interval',
      },
    })
  })

  it('forbids non-admin/moderator role', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 9, role: 'viewer', name: 'x' })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages', {
      method: 'GET',
    })
    const response = await GET(request)

    expect(response.status).toBe(403)
  })

  it('lists schedules for moderator', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 2, role: 'moderator', name: '부방장' })
    getRepoMock.mockResolvedValue({
      find: vi.fn().mockResolvedValue([
        {
          id: 1,
          scheduleName: '아침 인사',
          mode: 'fixed_time',
          fixedTime: '08:30',
          isActive: true,
        },
      ]),
    })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages', { method: 'GET' })
    const response = await GET(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ data: [{ scheduleName: '아침 인사' }] })
  })
})
