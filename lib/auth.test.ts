import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { comparePassword, hashPassword, signToken, verifyToken } from '@/lib/auth'

describe('auth helpers', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901'
  })

  afterEach(() => {
    delete process.env.JWT_SECRET
  })

  it('signs and verifies a token round-trip', async () => {
    const token = await signToken({
      userId: 10,
      email: 'admin@example.com',
      role: 'admin',
      name: 'Admin',
    })

    const payload = await verifyToken(token)
    expect(payload).not.toBeNull()
    expect(payload?.userId).toBe(10)
    expect(payload?.email).toBe('admin@example.com')
    expect(payload?.role).toBe('admin')
    expect(payload?.name).toBe('Admin')
  })

  it('returns null for invalid token', async () => {
    await expect(verifyToken('invalid-token')).resolves.toBeNull()
  })

  it('hashes and compares password correctly', async () => {
    const hashed = await hashPassword('my-password')

    expect(hashed).not.toBe('my-password')
    await expect(comparePassword('my-password', hashed)).resolves.toBe(true)
    await expect(comparePassword('wrong-password', hashed)).resolves.toBe(false)
  })

  it('throws when jwt secret is missing', async () => {
    delete process.env.JWT_SECRET
    await expect(
      signToken({
        userId: 1,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin',
      })
    ).rejects.toThrow('JWT_SECRET is required')
  })
})
