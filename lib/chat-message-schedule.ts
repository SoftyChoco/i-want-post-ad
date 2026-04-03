export type ChatMessageScheduleMode = 'interval' | 'fixed_time'

export interface ChatMessageSchedule {
  id: number
  scheduleName: string
  messageText: string
  mode: ChatMessageScheduleMode
  intervalMinutes: number | null
  fixedTime: string | null
  isActive: boolean
  respectNightBlock?: boolean
  lastDispatchedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessageNightWindowSettings {
  nightBlockEnabled: boolean
  nightStart: string | null
  nightEnd: string | null
}

function parseFixedTime(value: string | null): { hour: number; minute: number } | null {
  if (!value) return null
  const match = value.match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
  if (hour < 0 || hour > 23) return null
  if (minute < 0 || minute > 59) return null
  return { hour, minute }
}

function parseTimeToMinutes(value: string | null): number | null {
  const parsed = parseFixedTime(value)
  if (!parsed) return null
  return parsed.hour * 60 + parsed.minute
}

function getKstDateParts(now: Date): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
} {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value)

  if (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    Number.isInteger(hour) &&
    Number.isInteger(minute)
  ) {
    return { year, month, day, hour, minute }
  }

  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hour: (now.getUTCHours() + 9) % 24,
    minute: now.getUTCMinutes(),
  }
}

function getKstDateKey(now: Date): string {
  const parts = getKstDateParts(now)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function getTodayFixedTimeTarget(now: Date, fixedTime: string): Date | null {
  const parsed = parseFixedTime(fixedTime)
  if (!parsed) return null

  const kst = getKstDateParts(now)
  const utcMs = Date.UTC(kst.year, kst.month - 1, kst.day, parsed.hour - 9, parsed.minute, 0, 0)
  return new Date(utcMs)
}

function getKstNowMinutes(now: Date): number {
  const kst = getKstDateParts(now)
  return kst.hour * 60 + kst.minute
}

export function isWithinNightBlockWindow(settings: ChatMessageNightWindowSettings, now: Date): boolean {
  if (!settings.nightBlockEnabled) return false
  const startMinutes = parseTimeToMinutes(settings.nightStart)
  const endMinutes = parseTimeToMinutes(settings.nightEnd)
  if (startMinutes === null || endMinutes === null) return false

  const nowMinutes = getKstNowMinutes(now)
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes
  }
  if (startMinutes > endMinutes) {
    return nowMinutes >= startMinutes || nowMinutes < endMinutes
  }
  return true
}

export function computeNextRunAt(schedule: ChatMessageSchedule, now: Date = new Date()): Date | null {
  if (!schedule.isActive) return null

  if (schedule.mode === 'interval') {
    if (!schedule.intervalMinutes || schedule.intervalMinutes <= 0) return null
    const base = schedule.lastDispatchedAt || schedule.createdAt
    return new Date(base.getTime() + schedule.intervalMinutes * 60 * 1000)
  }

  if (!schedule.fixedTime) return null
  const todayTarget = getTodayFixedTimeTarget(now, schedule.fixedTime)
  if (!todayTarget) return null

  if (schedule.lastDispatchedAt) {
    const alreadyDispatchedToday = getKstDateKey(schedule.lastDispatchedAt) === getKstDateKey(now)
    if (alreadyDispatchedToday) {
      const tomorrowTarget = new Date(todayTarget)
      tomorrowTarget.setDate(tomorrowTarget.getDate() + 1)
      return tomorrowTarget
    }
  }

  return todayTarget
}

export function isScheduleDue(schedule: ChatMessageSchedule, now: Date = new Date()): boolean {
  const nextRunAt = computeNextRunAt(schedule, now)
  if (!nextRunAt) return false
  return now.getTime() >= nextRunAt.getTime()
}
