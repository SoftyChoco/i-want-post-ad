import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getUserRepoMock, getDbMock, getActorFromHeadersMock, hashPasswordMock, generateTemporaryPasswordMock } = vi.hoisted(() => ({
  getUserRepoMock: vi.fn(),
  getDbMock: vi.fn(),
  getActorFromHeadersMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  generateTemporaryPasswordMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getUserRepo: getUserRepoMock,
  getDb: getDbMock,
}))

vi.mock('@/lib/request-actor', () => ({
  getActorFromHeaders: getActorFromHeadersMock,
}))

vi.mock('@/lib/auth', () => ({
  hashPassword: hashPasswordMock,
}))

vi.mock('@/lib/password', () => ({
  generateTemporaryPassword: generateTemporaryPasswordMock,
}))

import { PATCH } from '@/app/api/admin/users/[id]/route'

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => {
    getActorFromHeadersMock.mockReturnValue({ userId: 1, role: 'admin', name: '방장' })
    generateTemporaryPasswordMock.mockReturnValue('ResetPass12')
    hashPasswordMock.mockResolvedValue('hashed-reset')
  })

  it('returns 403 for non-admin actor', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 2, role: 'moderator', name: '부방장' })
    const request = new NextRequest('http://localhost:3000/api/admin/users/3', { method: 'PATCH' })
    const response = await PATCH(request, { params: Promise.resolve({ id: '3' }) })
    expect(response.status).toBe(403)
  })

  it('returns 404 when target user does not exist', async () => {
    getUserRepoMock.mockResolvedValue({ findOneBy: vi.fn().mockResolvedValue(null) })
    const request = new NextRequest('http://localhost:3000/api/admin/users/99', { method: 'PATCH' })
    const response = await PATCH(request, { params: Promise.resolve({ id: '99' }) })
    expect(response.status).toBe(404)
  })

  it('resets moderator password and writes audit log', async () => {
    getUserRepoMock.mockResolvedValue({
      findOneBy: vi.fn().mockResolvedValue({ id: 3, role: 'moderator', name: '대상', email: 'mod@example.com' }),
    })

    const userRepoTx = { update: vi.fn().mockResolvedValue(undefined) }
    const auditRepoTx = { create: vi.fn((v) => v) }
    const manager = {
      getRepository: vi.fn((name: string) => (name === 'User' ? userRepoTx : auditRepoTx)),
      save: vi.fn().mockResolvedValue(undefined),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (callback: any) => callback(manager)) })

    const request = new NextRequest('http://localhost:3000/api/admin/users/3', { method: 'PATCH' })
    const response = await PATCH(request, { params: Promise.resolve({ id: '3' }) })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      temporaryPassword: 'ResetPass12',
      email: 'mod@example.com',
      name: '대상',
    })
    expect(userRepoTx.update).toHaveBeenCalledWith({ id: 3 }, { passwordHash: 'hashed-reset' })
    expect(manager.save).toHaveBeenCalledWith(
      'AuditLog',
      expect.objectContaining({ action: 'reset_mod_password', targetId: 3 })
    )
  })
})
