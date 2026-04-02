import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getSettingsMock, setSettingsMock, getActorFromHeadersMock } = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  setSettingsMock: vi.fn(),
  getActorFromHeadersMock: vi.fn(),
}))

vi.mock('@/lib/chat-message-settings', () => ({
  getOrCreateChatMessageSettings: getSettingsMock,
  setChatMessageSettings: setSettingsMock,
}))

vi.mock('@/lib/request-actor', () => ({
  getActorFromHeaders: getActorFromHeadersMock,
}))

import { GET, PATCH } from '@/app/api/admin/chat-messages/settings/route'

describe('admin chat message settings api', () => {
  beforeEach(() => {
    getSettingsMock.mockReset()
    setSettingsMock.mockReset()
    getActorFromHeadersMock.mockReset()
  })

  it('allows admin and moderator to read settings', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 1, role: 'moderator', name: '부방장' })
    getSettingsMock.mockResolvedValue({
      nightBlockEnabled: true,
      nightStart: '22:00',
      nightEnd: '07:00',
    })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/settings')
    const response = await GET(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: { nightBlockEnabled: true, nightStart: '22:00', nightEnd: '07:00' },
    })
  })

  it('forbids non-admin/moderator role', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 9, role: 'viewer', name: 'x' })
    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/settings')
    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it('updates common night settings', async () => {
    getActorFromHeadersMock.mockReturnValue({ userId: 1, role: 'admin', name: '방장' })
    setSettingsMock.mockResolvedValue({
      nightBlockEnabled: true,
      nightStart: '23:00',
      nightEnd: '06:00',
    })

    const request = new NextRequest('http://localhost:3000/api/admin/chat-messages/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        nightBlockEnabled: true,
        nightStart: '23:00',
        nightEnd: '06:00',
      }),
    })
    const response = await PATCH(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: { nightBlockEnabled: true, nightStart: '23:00', nightEnd: '06:00' },
    })
  })
})
