import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getScheduleRepoMock, getDirectRepoMock, getDbMock } = vi.hoisted(() => ({
  getScheduleRepoMock: vi.fn(),
  getDirectRepoMock: vi.fn(),
  getDbMock: vi.fn(),
}))

const { getSettingsMock } = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getChatMessageScheduleRepo: getScheduleRepoMock,
  getChatMessageDirectRepo: getDirectRepoMock,
  getDb: getDbMock,
}))

vi.mock('@/lib/chat-message-settings', () => ({
  getOrCreateChatMessageSettings: getSettingsMock,
}))

import { GET } from '@/app/api/chat-messages/poll/route'

describe('GET /api/chat-messages/poll', () => {
  beforeEach(() => {
    delete process.env.KAKAO_BOT_TOKEN
    getScheduleRepoMock.mockReset()
    getDirectRepoMock.mockReset()
    getDbMock.mockReset()
    getSettingsMock.mockReset()
    getSettingsMock.mockResolvedValue({
      nightBlockEnabled: false,
      nightStart: '22:00',
      nightEnd: '07:00',
    })
  })

  it('returns 500 when bot token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat-messages/poll')
    const response = await GET(request)

    expect(response.status).toBe(500)
  })

  it('returns 403 when token is invalid', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'
    const request = new NextRequest('http://localhost:3000/api/chat-messages/poll', {
      headers: { authorization: 'Bearer invalid' },
    })
    const response = await GET(request)

    expect(response.status).toBe(403)
  })

  it('returns due schedules and updates last dispatched time', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    const dueSchedule = {
      id: 9,
      scheduleName: '공지 스케줄',
      messageText: '공지사항입니다',
      mode: 'interval',
      intervalMinutes: 1,
      fixedTime: null,
      isActive: true,
      createdAt: new Date('2026-04-02T08:00:00.000Z'),
      updatedAt: new Date('2026-04-02T08:00:00.000Z'),
      lastDispatchedAt: new Date('2026-04-02T08:00:00.000Z'),
    }

    getScheduleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([dueSchedule]) })
    getDirectRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })

    const manager = {
      getRepository: vi.fn(() => ({ save: vi.fn().mockResolvedValue({}) })),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: any) => cb(manager)) })

    const request = new NextRequest('http://localhost:3000/api/chat-messages/poll', {
      headers: { authorization: 'Bearer bot-token' },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: 9, scheduleName: '공지 스케줄', messageText: '공지사항입니다' }],
    })
  })

  it('does not return schedule during configured night block window', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    const blockedSchedule = {
      id: 10,
      scheduleName: '야간 차단 스케줄',
      messageText: '야간에는 보내면 안됨',
      mode: 'interval',
      intervalMinutes: 1,
      fixedTime: null,
      isActive: true,
      createdAt: new Date('2026-04-02T08:00:00.000Z'),
      updatedAt: new Date('2026-04-02T08:00:00.000Z'),
      lastDispatchedAt: new Date('2026-04-02T13:00:00.000Z'),
    }

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T13:30:00.000Z'))

    getScheduleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([blockedSchedule]) })
    getDirectRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getSettingsMock.mockResolvedValue({
      nightBlockEnabled: true,
      nightStart: '22:00',
      nightEnd: '07:00',
    })
    const manager = {
      getRepository: vi.fn(() => ({ save: vi.fn().mockResolvedValue({}) })),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: any) => cb(manager)) })

    const request = new NextRequest('http://localhost:3000/api/chat-messages/poll', {
      headers: { authorization: 'Bearer bot-token' },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ data: [] })
    vi.useRealTimers()
  })

  it('returns pending direct message and marks it dispatched', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    getScheduleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getDirectRepoMock.mockResolvedValue({
      find: vi.fn().mockResolvedValue([
        {
          id: 77,
          messageText: '직접 메시지 테스트',
          createdByName: '방장',
          dispatchedAt: null,
        },
      ]),
    })

    const manager = {
      getRepository: vi.fn(() => ({ save: vi.fn().mockResolvedValue({}) })),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: any) => cb(manager)) })

    const request = new NextRequest('http://localhost:3000/api/chat-messages/poll', {
      headers: { authorization: 'Bearer bot-token' },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: 77, scheduleName: '직접 메시지', messageText: '직접 메시지 테스트' }],
    })
  })
})
