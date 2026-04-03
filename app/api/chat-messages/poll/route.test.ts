import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getScheduleRepoMock, getDirectRepoMock, getTriggerRuleRepoMock, getEventRepoMock, getDbMock } = vi.hoisted(() => ({
  getScheduleRepoMock: vi.fn(),
  getDirectRepoMock: vi.fn(),
  getTriggerRuleRepoMock: vi.fn(),
  getEventRepoMock: vi.fn(),
  getDbMock: vi.fn(),
}))

const { getSettingsMock } = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getChatMessageScheduleRepo: getScheduleRepoMock,
  getChatMessageDirectRepo: getDirectRepoMock,
  getChatMessageTriggerRuleRepo: getTriggerRuleRepoMock,
  getChatEventRepo: getEventRepoMock,
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
    getTriggerRuleRepoMock.mockReset()
    getEventRepoMock.mockReset()
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
    getTriggerRuleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getEventRepoMock.mockResolvedValue({ findOne: vi.fn().mockResolvedValue(null) })

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
      respectNightBlock: true,
      createdAt: new Date('2026-04-02T08:00:00.000Z'),
      updatedAt: new Date('2026-04-02T08:00:00.000Z'),
      lastDispatchedAt: new Date('2026-04-02T13:00:00.000Z'),
    }

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T13:30:00.000Z'))

    getScheduleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([blockedSchedule]) })
    getDirectRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getTriggerRuleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getEventRepoMock.mockResolvedValue({ findOne: vi.fn().mockResolvedValue(null) })
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

  it('returns schedule during night window when per-schedule night block is disabled', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    const allowedSchedule = {
      id: 12,
      scheduleName: '야간 허용 스케줄',
      messageText: '야간에도 발송',
      mode: 'interval',
      intervalMinutes: 1,
      fixedTime: null,
      isActive: true,
      respectNightBlock: false,
      createdAt: new Date('2026-04-02T08:00:00.000Z'),
      updatedAt: new Date('2026-04-02T08:00:00.000Z'),
      lastDispatchedAt: new Date('2026-04-02T13:00:00.000Z'),
    }

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T13:30:00.000Z'))

    getScheduleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([allowedSchedule]) })
    getDirectRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getTriggerRuleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getEventRepoMock.mockResolvedValue({ findOne: vi.fn().mockResolvedValue(null) })
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
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: 12, scheduleName: '야간 허용 스케줄', messageText: '야간에도 발송' }],
    })
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
    getTriggerRuleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getEventRepoMock.mockResolvedValue({ findOne: vi.fn().mockResolvedValue(null) })

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

  it('filters out already dispatched direct messages defensively', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    getScheduleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getDirectRepoMock.mockResolvedValue({
      find: vi.fn().mockResolvedValue([
        {
          id: 80,
          messageText: '이미 발송됨',
          createdByName: '방장',
          dispatchedAt: new Date('2026-04-03T01:00:00.000Z'),
        },
      ]),
    })
    getTriggerRuleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getEventRepoMock.mockResolvedValue({ findOne: vi.fn().mockResolvedValue(null) })

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
  })

  it('still returns schedule data when direct repo is unavailable', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    const dueSchedule = {
      id: 21,
      scheduleName: '스케줄 메시지',
      messageText: '정상 스케줄 메시지',
      mode: 'interval',
      intervalMinutes: 1,
      fixedTime: null,
      isActive: true,
      createdAt: new Date('2026-04-02T08:00:00.000Z'),
      updatedAt: new Date('2026-04-02T08:00:00.000Z'),
      lastDispatchedAt: new Date('2026-04-02T08:00:00.000Z'),
    }

    getScheduleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([dueSchedule]) })
    getDirectRepoMock.mockRejectedValue(new TypeError('getChatMessageDirectRepo is not a function'))
    getTriggerRuleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getEventRepoMock.mockResolvedValue({ findOne: vi.fn().mockResolvedValue(null) })

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
      data: [{ id: 21, scheduleName: '스케줄 메시지', messageText: '정상 스케줄 메시지' }],
    })
  })

  it('returns matched trigger-rule response and updates cursor', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    getScheduleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getDirectRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getTriggerRuleRepoMock.mockResolvedValue({
      find: vi.fn().mockResolvedValue([
        {
          id: 11,
          ruleName: '신청안내',
          keyword: '신청',
          authorName: null,
          responseText: '신청은 /submit 에서 진행해주세요',
          isActive: true,
          lastMatchedEventId: 100,
        },
      ]),
    })
    getEventRepoMock.mockResolvedValue({
      findOne: vi.fn().mockResolvedValue({ id: 101 }),
    })

    const manager = {
      getRepository: vi.fn((target: string | { name?: string }) => {
        if (target === 'ChatMessageTriggerRule' || (typeof target !== 'string' && target.name === 'ChatMessageTriggerRule')) {
          return { update: vi.fn().mockResolvedValue({}) }
        }
        return { save: vi.fn().mockResolvedValue({}) }
      }),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: any) => cb(manager)) })

    const request = new NextRequest('http://localhost:3000/api/chat-messages/poll', {
      headers: { authorization: 'Bearer bot-token' },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: 11, scheduleName: '자동응답: 신청안내', messageText: '신청은 /submit 에서 진행해주세요' }],
    })
  })

  it('keeps schedule payload when trigger metadata is unavailable', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    const dueSchedule = {
      id: 35,
      scheduleName: '기본 스케줄',
      messageText: '스케줄 우선 확인',
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
    const metadataError = Object.assign(new Error('No metadata'), { name: 'EntityMetadataNotFoundError' })
    getTriggerRuleRepoMock.mockRejectedValue(metadataError)

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
      data: [{ id: 35, scheduleName: '기본 스케줄', messageText: '스케줄 우선 확인' }],
    })
  })

  it('returns direct messages when schedule metadata is unavailable', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    const metadataError = Object.assign(new Error('No metadata'), { name: 'EntityMetadataNotFoundError' })
    getScheduleRepoMock.mockRejectedValue(metadataError)
    getDirectRepoMock.mockResolvedValue({
      find: vi.fn().mockResolvedValue([
        {
          id: 88,
          messageText: '스케줄 없이 직접 메시지',
          createdByName: '방장',
          dispatchedAt: null,
        },
      ]),
    })
    getTriggerRuleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getEventRepoMock.mockResolvedValue({ findOne: vi.fn().mockResolvedValue(null) })

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
      data: [{ id: 88, scheduleName: '직접 메시지', messageText: '스케줄 없이 직접 메시지' }],
    })
  })

  it('recovers stale trigger cursor when lastMatchedEventId is ahead of latest event id', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    getScheduleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getDirectRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getTriggerRuleRepoMock.mockResolvedValue({
      find: vi.fn().mockResolvedValue([
        {
          id: 19,
          ruleName: '커서 복구 룰',
          keyword: '신청',
          authorName: null,
          responseText: '신청은 /submit 참고',
          isActive: true,
          lastMatchedEventId: 9999,
        },
      ]),
    })

    const findOne = vi
      .fn()
      .mockResolvedValueOnce({ id: 120 })
      .mockResolvedValueOnce({ id: 118 })

    getEventRepoMock.mockResolvedValue({ findOne })

    const manager = {
      getRepository: vi.fn((target: string | { name?: string }) => {
        if (target === 'ChatMessageTriggerRule' || (typeof target !== 'string' && target.name === 'ChatMessageTriggerRule')) {
          return { update: vi.fn().mockResolvedValue({}) }
        }
        return { save: vi.fn().mockResolvedValue({}) }
      }),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: any) => cb(manager)) })

    const request = new NextRequest('http://localhost:3000/api/chat-messages/poll', {
      headers: { authorization: 'Bearer bot-token' },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: 19, scheduleName: '자동응답: 커서 복구 룰', messageText: '신청은 /submit 참고' }],
    })
  })

  it('keeps triggering on new matching events across consecutive polls', async () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    let cursor = 0

    getScheduleRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getDirectRepoMock.mockResolvedValue({ find: vi.fn().mockResolvedValue([]) })
    getTriggerRuleRepoMock.mockResolvedValue({
      find: vi.fn().mockImplementation(async () => ([
        {
          id: 30,
          ruleName: '연속 응답 룰',
          keyword: '신청',
          authorName: null,
          responseText: '신청 안내 메시지',
          isActive: true,
          lastMatchedEventId: cursor,
        },
      ])),
    })

    getEventRepoMock.mockResolvedValue({
      findOne: vi.fn().mockImplementation(async (args: any) => {
        if (args?.order?.id === 'DESC') return { id: 2 }
        return cursor === 0 ? { id: 1 } : cursor === 1 ? { id: 2 } : null
      }),
    })

    const manager = {
      getRepository: vi.fn((target: string | { name?: string }) => {
        if (target === 'ChatMessageTriggerRule' || (typeof target !== 'string' && target.name === 'ChatMessageTriggerRule')) {
          return {
            update: vi.fn().mockImplementation(async (_where: any, patch: any) => {
              cursor = patch.lastMatchedEventId
              return {}
            }),
          }
        }
        return { save: vi.fn().mockResolvedValue({}) }
      }),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (cb: any) => cb(manager)) })

    const firstRequest = new NextRequest('http://localhost:3000/api/chat-messages/poll', {
      headers: { authorization: 'Bearer bot-token' },
    })
    const firstResponse = await GET(firstRequest)
    expect(firstResponse.status).toBe(200)
    await expect(firstResponse.json()).resolves.toMatchObject({
      data: [{ id: 30, scheduleName: '자동응답: 연속 응답 룰', messageText: '신청 안내 메시지' }],
    })

    const secondRequest = new NextRequest('http://localhost:3000/api/chat-messages/poll', {
      headers: { authorization: 'Bearer bot-token' },
    })
    const secondResponse = await GET(secondRequest)
    expect(secondResponse.status).toBe(200)
    await expect(secondResponse.json()).resolves.toMatchObject({
      data: [{ id: 30, scheduleName: '자동응답: 연속 응답 룰', messageText: '신청 안내 메시지' }],
    })
  })
})
