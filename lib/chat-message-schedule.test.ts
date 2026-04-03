import { describe, expect, it } from 'vitest'
import {
  computeNextRunAt,
  isWithinNightBlockWindow,
  isScheduleDue,
  type ChatMessageSchedule,
} from '@/lib/chat-message-schedule'

function makeSchedule(overrides: Partial<ChatMessageSchedule>): ChatMessageSchedule {
  return {
    id: 1,
    scheduleName: '기본 스케줄',
    messageText: '공지',
    mode: 'interval',
    intervalMinutes: 30,
    fixedTime: null,
    isActive: true,
    lastDispatchedAt: null,
    createdAt: new Date('2026-04-02T00:00:00.000Z'),
    updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    ...overrides,
  }
}

describe('chat message schedule core logic', () => {
  it('computes first due time for interval schedule from creation time', () => {
    const schedule = makeSchedule({
      createdAt: new Date('2026-04-02T08:00:00.000Z'),
      intervalMinutes: 15,
      lastDispatchedAt: null,
    })

    const next = computeNextRunAt(schedule, new Date('2026-04-02T08:10:00.000Z'))
    expect(next?.toISOString()).toBe('2026-04-02T08:15:00.000Z')
  })

  it('computes next due time for interval schedule from last dispatch', () => {
    const schedule = makeSchedule({
      intervalMinutes: 20,
      lastDispatchedAt: new Date('2026-04-02T08:20:00.000Z'),
    })

    const next = computeNextRunAt(schedule, new Date('2026-04-02T08:30:00.000Z'))
    expect(next?.toISOString()).toBe('2026-04-02T08:40:00.000Z')
  })

  it('computes next due time for fixed_time schedule in KST basis', () => {
    const schedule = makeSchedule({
      mode: 'fixed_time',
      fixedTime: '14:10',
      intervalMinutes: null,
      createdAt: new Date('2026-04-02T00:00:00.000Z'),
    })

    const next = computeNextRunAt(schedule, new Date('2026-04-03T05:09:00.000Z'))
    expect(next?.toISOString()).toBe('2026-04-03T05:10:00.000Z')
  })

  it('moves fixed_time schedule to next day when already dispatched on same KST date', () => {
    const schedule = makeSchedule({
      mode: 'fixed_time',
      fixedTime: '14:10',
      intervalMinutes: null,
      lastDispatchedAt: new Date('2026-04-03T05:10:00.000Z'),
    })

    const next = computeNextRunAt(schedule, new Date('2026-04-03T06:00:00.000Z'))
    expect(next?.toISOString()).toBe('2026-04-04T05:10:00.000Z')
  })

  it('treats fixed_time as due after target time on same KST date when not yet dispatched', () => {
    const schedule = makeSchedule({
      mode: 'fixed_time',
      fixedTime: '14:10',
      intervalMinutes: null,
      lastDispatchedAt: null,
    })

    expect(isScheduleDue(schedule, new Date('2026-04-03T05:11:00.000Z'))).toBe(true)
  })

  it('marks schedule as due when now is after next run', () => {
    const schedule = makeSchedule({
      intervalMinutes: 10,
      lastDispatchedAt: new Date('2026-04-02T08:00:00.000Z'),
    })

    expect(isScheduleDue(schedule, new Date('2026-04-02T08:11:00.000Z'))).toBe(true)
  })

  it('returns false for inactive schedule', () => {
    const schedule = makeSchedule({ isActive: false })
    expect(isScheduleDue(schedule, new Date('2026-04-02T08:11:00.000Z'))).toBe(false)
  })

  it('detects blocked time for overnight night window', () => {
    const blocked = isWithinNightBlockWindow(
      { nightBlockEnabled: true, nightStart: '22:00', nightEnd: '07:00' },
      new Date('2026-04-02T13:40:00.000Z')
    )
    expect(blocked).toBe(true)
  })

  it('returns not blocked outside overnight window', () => {
    const blocked = isWithinNightBlockWindow(
      { nightBlockEnabled: true, nightStart: '22:00', nightEnd: '07:00' },
      new Date('2026-04-02T10:20:00.000Z')
    )
    expect(blocked).toBe(false)
  })
})
