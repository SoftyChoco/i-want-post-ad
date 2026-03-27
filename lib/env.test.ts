import { describe, expect, it } from 'vitest'
import { getJwtSecretBytes, getRequiredEnv } from '@/lib/env'

describe('env helpers', () => {
  it('returns required env value when present', () => {
    process.env.SAMPLE_ENV = 'value'
    expect(getRequiredEnv('SAMPLE_ENV')).toBe('value')
    delete process.env.SAMPLE_ENV
  })

  it('throws when required env is missing', () => {
    delete process.env.SAMPLE_ENV
    expect(() => getRequiredEnv('SAMPLE_ENV')).toThrow('SAMPLE_ENV is required')
  })

  it('validates jwt secret minimum length', () => {
    process.env.JWT_SECRET = 'short-secret'
    expect(() => getJwtSecretBytes()).toThrow('JWT_SECRET must be at least 32 characters long')

    process.env.JWT_SECRET = '01234567890123456789012345678901'
    expect(getJwtSecretBytes()).toBeInstanceOf(Uint8Array)
    delete process.env.JWT_SECRET
  })
})
