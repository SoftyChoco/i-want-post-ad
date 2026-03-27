import { describe, expect, it } from 'vitest'
import { isSameOriginUiRequestFromHeaders } from '@/lib/api-origin-guard'

describe('isSameOriginUiRequestFromHeaders', () => {
  const expectedOrigin = 'http://localhost:3000'
  const expectedHost = 'localhost:3000'

  it('allows request when origin exactly matches expected origin', () => {
    expect(
      isSameOriginUiRequestFromHeaders({
        expectedOrigin,
        expectedHost,
        origin: 'http://localhost:3000',
        referer: null,
      })
    ).toBe(true)
  })

  it('allows request when referer host matches expected host', () => {
    expect(
      isSameOriginUiRequestFromHeaders({
        expectedOrigin,
        expectedHost,
        origin: null,
        referer: 'http://localhost:3000/admin',
      })
    ).toBe(true)
  })

  it('rejects request when origin and referer are missing', () => {
    expect(
      isSameOriginUiRequestFromHeaders({
        expectedOrigin,
        expectedHost,
        origin: null,
        referer: null,
      })
    ).toBe(false)
  })

  it('rejects malformed origin values', () => {
    expect(
      isSameOriginUiRequestFromHeaders({
        expectedOrigin,
        expectedHost,
        origin: 'not-a-url',
        referer: null,
      })
    ).toBe(false)
  })

  it('rejects cross-origin values', () => {
    expect(
      isSameOriginUiRequestFromHeaders({
        expectedOrigin,
        expectedHost,
        origin: 'https://evil.example.com',
        referer: null,
      })
    ).toBe(false)
  })
})
