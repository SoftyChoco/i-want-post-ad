import { describe, expect, it, vi } from 'vitest'
import { getRequestCodeExpiryAt, isRequestCodeExpired, REQUEST_CODE_EXPIRY_MS } from '@/lib/request-code-expiry'

describe('request code expiry helpers', () => {
  it('calculates expiry as reviewedAt + 24 hours', () => {
    const reviewedAt = new Date('2026-03-28T00:00:00.000Z')
    const expiryAt = getRequestCodeExpiryAt(reviewedAt)
    expect(expiryAt?.getTime()).toBe(reviewedAt.getTime() + REQUEST_CODE_EXPIRY_MS)
  })

  it('returns expired only for approved status after expiry point', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T01:00:00.000Z'))

    const reviewedAt = new Date('2026-03-28T00:00:00.000Z')
    expect(isRequestCodeExpired('approved', reviewedAt)).toBe(true)
    expect(isRequestCodeExpired('pending', reviewedAt)).toBe(false)
    expect(isRequestCodeExpired('rejected', reviewedAt)).toBe(false)

    vi.useRealTimers()
  })
})
