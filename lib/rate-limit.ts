type RateLimitConfig = { windowMs: number; maxRequests: number }

const presets = {
  submit: { windowMs: 10 * 60 * 1000, maxRequests: 5 },
  login: { windowMs: 5 * 60 * 1000, maxRequests: 10 },
  verify: { windowMs: 60 * 1000, maxRequests: 30 },
  public_lookup_contact: { windowMs: 60 * 1000, maxRequests: 5 },
  admin_lookup_read: { windowMs: 60 * 1000, maxRequests: 15 },
} as const

const store = new Map<string, number[]>()

// Clean up old entries every hour
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, timestamps] of store.entries()) {
      const filtered = timestamps.filter(t => now - t < 10 * 60 * 1000)
      if (filtered.length === 0) {
        store.delete(key)
      } else {
        store.set(key, filtered)
      }
    }
  }, 60 * 60 * 1000)
  cleanupTimer.unref?.()
}

export function checkRateLimit(
  key: string,
  preset: keyof typeof presets
): { allowed: boolean; retryAfterMs?: number } {
  const config = presets[preset]
  const now = Date.now()
  const timestamps = store.get(key) || []
  const windowStart = now - config.windowMs
  const filtered = timestamps.filter(t => t > windowStart)

  if (filtered.length >= config.maxRequests) {
    const oldest = filtered[0]
    const retryAfterMs = oldest + config.windowMs - now
    return { allowed: false, retryAfterMs }
  }

  filtered.push(now)
  store.set(key, filtered)
  return { allowed: true }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
