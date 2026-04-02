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

function getTodayFixedTimeTarget(now: Date, fixedTime: string): Date | null {
  const parsed = parseFixedTime(fixedTime)
  if (!parsed) return null

  const target = new Date(now)
  target.setHours(parsed.hour, parsed.minute, 0, 0)
  return target
}

function parseTimeToMinutes(value: string | null): number | null {
  const parsed = parseFixedTime(value)
  if (!parsed) return null
  return parsed.hour * 60 + parsed.minute
}

export function isWithinNightBlockWindow(settings: ChatMessageNightWindowSettings, now: Date): boolean {
  if (!settings.nightBlockEnabled) return false
  const startMinutes = parseTimeToMinutes(settings.nightStart)
  const endMinutes = parseTimeToMinutes(settings.nightEnd)
  if (startMinutes === null || endMinutes === null) return false

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
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
    const alreadyDispatchedToday =
      schedule.lastDispatchedAt.getFullYear() === now.getFullYear() &&
      schedule.lastDispatchedAt.getMonth() === now.getMonth() &&
      schedule.lastDispatchedAt.getDate() === now.getDate()
    if (alreadyDispatchedToday) {
      const tomorrowTarget = new Date(todayTarget)
      tomorrowTarget.setDate(tomorrowTarget.getDate() + 1)
      return tomorrowTarget
    }
  }

  if (todayTarget.getTime() >= now.getTime()) {
    return todayTarget
  }

  const nextDay = new Date(todayTarget)
  nextDay.setDate(nextDay.getDate() + 1)
  return nextDay
}

export function isScheduleDue(schedule: ChatMessageSchedule, now: Date = new Date()): boolean {
  const nextRunAt = computeNextRunAt(schedule, now)
  if (!nextRunAt) return false
  return now.getTime() >= nextRunAt.getTime()
}
