import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  getDbMock,
  getUserRepoMock,
  comparePasswordMock,
  hashPasswordMock,
  checkRateLimitMock,
  getClientIpMock,
  getActorFromHeadersMock,
} = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  getUserRepoMock: vi.fn(),
  comparePasswordMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getClientIpMock: vi.fn(),
  getActorFromHeadersMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getDb: getDbMock,
  getUserRepo: getUserRepoMock,
}))

vi.mock('@/lib/auth', () => ({
  comparePassword: comparePasswordMock,
  hashPassword: hashPasswordMock,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: getClientIpMock,
}))

vi.mock('@/lib/request-actor', () => ({
  getActorFromHeaders: getActorFromHeadersMock,
}))

import { POST } from '@/app/api/admin/password/route'

describe('POST /api/admin/password', () => {
  beforeEach(() => {
    checkRateLimitMock.mockReturnValue({ allowed: true })
    getClientIpMock.mockReturnValue('127.0.0.1')
    getActorFromHeadersMock.mockReturnValue({ userId: 2, role: 'moderator', name: '테스트' })
  })

  it('returns 403 when actor role is invalid', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 2, role: 'guest', name: '게스트' })
    const request = new NextRequest('http://localhost:3000/api/admin/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'oldpass123', newPassword: 'newpass123' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('returns 401 when current password is wrong', async () => {
    const findOneByMock = vi.fn().mockResolvedValue({ id: 2, passwordHash: 'stored-hash' })
    getUserRepoMock.mockResolvedValue({ findOneBy: findOneByMock })
    comparePasswordMock.mockResolvedValue(false)

    const request = new NextRequest('http://localhost:3000/api/admin/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'wrongpass123', newPassword: 'newpass123' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'AUTH_INVALID_CREDENTIALS', message: '현재 비밀번호가 올바르지 않습니다' },
    })
  })

  it('updates password and writes audit log on success', async () => {
    const findOneByMock = vi.fn().mockResolvedValue({ id: 2, passwordHash: 'stored-hash' })
    getUserRepoMock.mockResolvedValue({ findOneBy: findOneByMock })
    comparePasswordMock.mockResolvedValue(true)
    hashPasswordMock.mockResolvedValue('new-hash')

    const userRepoTx = { update: vi.fn().mockResolvedValue(undefined) }
    const auditRepoTx = { create: vi.fn((value) => value) }
    const manager = {
      getRepository: vi.fn((name: string) => {
        if (name === 'User') return userRepoTx
        return auditRepoTx
      }),
      save: vi.fn().mockResolvedValue(undefined),
    }
    const transactionMock = vi.fn(async (callback: (arg: typeof manager) => Promise<void>) => callback(manager))
    getDbMock.mockResolvedValue({ transaction: transactionMock })

    const request = new NextRequest('http://localhost:3000/api/admin/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'oldpass123', newPassword: 'newpass123' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true })
    expect(userRepoTx.update).toHaveBeenCalledWith({ id: 2 }, { passwordHash: 'new-hash' })
    expect(manager.save).toHaveBeenCalledWith(
      'AuditLog',
      expect.objectContaining({ action: 'change_password', targetType: 'user', targetId: 2 })
    )
  })
})
