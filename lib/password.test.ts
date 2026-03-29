import { describe, expect, it } from 'vitest'
import { generateTemporaryPassword } from '@/lib/password'

describe('generateTemporaryPassword', () => {
  it('returns at least 8 chars and expected charset', () => {
    const password = generateTemporaryPassword(12)
    expect(password.length).toBe(12)
    expect(/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]+$/.test(password)).toBe(true)
  })

  it('enforces minimum length when requested length is too small', () => {
    const password = generateTemporaryPassword(4)
    expect(password.length).toBe(8)
  })
})
