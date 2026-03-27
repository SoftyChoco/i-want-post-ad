import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-27T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('blocks when max requests are exceeded and returns retryAfterMs', () => {
    const key = 'submit-user-a'

    expect(checkRateLimit(key, 'submit')).toEqual({ allowed: true })
    expect(checkRateLimit(key, 'submit')).toEqual({ allowed: true })
    expect(checkRateLimit(key, 'submit')).toEqual({ allowed: true })
    expect(checkRateLimit(key, 'submit')).toEqual({ allowed: true })
    expect(checkRateLimit(key, 'submit')).toEqual({ allowed: true })

    const blocked = checkRateLimit(key, 'submit')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(10 * 60 * 1000)
  })

  it('allows requests again after the rate-limit window passes', () => {
    const key = 'submit-user-b'

    for (let i = 0; i < 5; i += 1) {
      expect(checkRateLimit(key, 'submit').allowed).toBe(true)
    }
    expect(checkRateLimit(key, 'submit').allowed).toBe(false)

    vi.advanceTimersByTime(10 * 60 * 1000 + 1)
    expect(checkRateLimit(key, 'submit')).toEqual({ allowed: true })
  })

  it('enforces stricter admin lookup read limit', () => {
    const key = 'admin-read-a'

    for (let i = 0; i < 15; i += 1) {
      expect(checkRateLimit(key, 'admin_lookup_read')).toEqual({ allowed: true })
    }

    const blocked = checkRateLimit(key, 'admin_lookup_read')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(60 * 1000)
  })

  it('allows up to 10 login requests per 5 minutes', () => {
    const key = 'login-user-a'

    for (let i = 0; i < 10; i += 1) {
      expect(checkRateLimit(key, 'login')).toEqual({ allowed: true })
    }

    const blocked = checkRateLimit(key, 'login')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(5 * 60 * 1000)
  })
})

describe('getClientIp', () => {
  it('prefers the first x-forwarded-for IP', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.1.1.1, 2.2.2.2',
        'x-real-ip': '9.9.9.9',
      },
    })

    expect(getClientIp(request)).toBe('1.1.1.1')
  })

  it('falls back to x-real-ip and then unknown', () => {
    const withRealIp = new Request('http://localhost', {
      headers: { 'x-real-ip': '3.3.3.3' },
    })
    expect(getClientIp(withRealIp)).toBe('3.3.3.3')

    const unknown = new Request('http://localhost')
    expect(getClientIp(unknown)).toBe('unknown')
  })
})
