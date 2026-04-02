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

import { POST } from '@/app/api/admin/users/route'

describe('POST /api/admin/users', () => {
  beforeEach(() => {
    getActorFromHeadersMock.mockReturnValue({ userId: 1, role: 'admin', name: '방장' })
    generateTemporaryPasswordMock.mockReturnValue('TempPass12')
    hashPasswordMock.mockResolvedValue('hashed-temp')
  })

  it('creates moderator with generated temporary password', async () => {
    const findOneByMock = vi.fn().mockResolvedValue(null)
    getUserRepoMock.mockResolvedValue({ findOneBy: findOneByMock })

    const userRepoTx = {
      create: vi.fn((v) => v),
    }
    const auditRepoTx = {
      create: vi.fn((v) => v),
    }
    const manager = {
      getRepository: vi.fn((target: string | { name?: string }) => (target === 'User' || (typeof target !== 'string' && target.name === 'User') ? userRepoTx : auditRepoTx)),
      save: vi.fn().mockImplementation(async (target: string | { name?: string }, value: any) => {
        if (target === 'User' || (typeof target !== 'string' && target.name === 'User')) return { id: 3, ...value }
        return value
      }),
    }
    getDbMock.mockResolvedValue({ transaction: vi.fn(async (callback: any) => callback(manager)) })

    const request = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'mod@example.com', name: '부방장' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      email: 'mod@example.com',
      name: '부방장',
      role: 'moderator',
      temporaryPassword: 'TempPass12',
    })
  })

  it('returns 409 when email already exists', async () => {
    getUserRepoMock.mockResolvedValue({ findOneBy: vi.fn().mockResolvedValue({ id: 2 }) })
    const request = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'mod@example.com', name: '부방장' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(409)
  })
})
