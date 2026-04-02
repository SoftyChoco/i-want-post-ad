import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import * as nextTestingServer from 'next/experimental/testing/server'
import nextConfig from '@/next.config'

const { jwtVerifyMock } = vi.hoisted(() => ({
  jwtVerifyMock: vi.fn(),
}))

vi.mock('jose', () => ({
  jwtVerify: jwtVerifyMock,
}))

import { config, proxy } from '@/proxy'

type MatcherFn = (input: {
  config: typeof config
  nextConfig: typeof nextConfig
  url: string
}) => boolean

const doesProxyMatch =
  (nextTestingServer as unknown as {
    unstable_doesProxyMatch?: MatcherFn
    unstable_doesMiddlewareMatch?: MatcherFn
  }).unstable_doesProxyMatch ??
  (nextTestingServer as unknown as {
    unstable_doesProxyMatch?: MatcherFn
    unstable_doesMiddlewareMatch?: MatcherFn
  }).unstable_doesMiddlewareMatch

describe('proxy matcher', () => {
  it('matches admin and api routes only', () => {
    expect(doesProxyMatch).toBeDefined()
    expect(
      doesProxyMatch?.({
        config,
        nextConfig,
        url: '/admin/users',
      })
    ).toBe(true)

    expect(
      doesProxyMatch?.({
        config,
        nextConfig,
        url: '/api/admin/requests',
      })
    ).toBe(true)

    expect(
      doesProxyMatch?.({
        config,
        nextConfig,
        url: '/submit',
      })
    ).toBe(false)
  })
})

describe('proxy behavior', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901'
    process.env.KAKAO_BOT_TOKEN = 'bot-token'
    jwtVerifyMock.mockReset()
  })

  afterEach(() => {
    delete process.env.JWT_SECRET
    delete process.env.KAKAO_BOT_TOKEN
  })

  it('blocks direct api calls without same-origin headers', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/requests', {
      headers: { host: 'localhost:3000' },
    })

    const response = await proxy(request)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'DIRECT_API_BLOCKED', message: '직접 API 호출은 허용되지 않습니다' },
    })
  })

  it('allows internal maintenance path through origin guard', async () => {
    const request = new NextRequest('http://localhost:3000/api/internal/maintenance/recover-llm', {
      headers: { host: 'localhost:3000' },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
  })

  it('allows direct /api/verify when bot token is valid', async () => {
    const request = new NextRequest('http://localhost:3000/api/verify?requestCode=REQ-20260329-ABCD', {
      headers: {
        host: 'localhost:3000',
        authorization: 'Bearer bot-token',
      },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
  })

  it('still blocks direct /api/verify without bot token', async () => {
    const request = new NextRequest('http://localhost:3000/api/verify?requestCode=REQ-20260329-ABCD', {
      headers: { host: 'localhost:3000' },
    })

    const response = await proxy(request)

    expect(response.status).toBe(403)
  })

  it('allows direct /api/requests/summary when bot token is valid', async () => {
    const request = new NextRequest('http://localhost:3000/api/requests/summary', {
      headers: {
        host: 'localhost:3000',
        authorization: 'Bearer bot-token',
      },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
  })

  it('still blocks direct /api/requests/summary without bot token', async () => {
    const request = new NextRequest('http://localhost:3000/api/requests/summary', {
      headers: { host: 'localhost:3000' },
    })

    const response = await proxy(request)

    expect(response.status).toBe(403)
  })

  it('allows direct /api/chat-messages/poll when bot token is valid', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat-messages/poll', {
      headers: {
        host: 'localhost:3000',
        authorization: 'Bearer bot-token',
      },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
  })

  it('still blocks direct /api/chat-messages/poll without bot token', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat-messages/poll', {
      headers: { host: 'localhost:3000' },
    })

    const response = await proxy(request)

    expect(response.status).toBe(403)
  })

  it('allows direct /api/chat-events/bulk when bot token is valid', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat-events/bulk', {
      headers: {
        host: 'localhost:3000',
        authorization: 'Bearer bot-token',
      },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
  })

  it('still blocks direct /api/chat-events/bulk without bot token', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat-events/bulk', {
      headers: { host: 'localhost:3000' },
    })

    const response = await proxy(request)

    expect(response.status).toBe(403)
  })

  it('allows health path through origin guard', async () => {
    const request = new NextRequest('http://localhost:3000/api/health', {
      headers: { host: 'localhost:3000' },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
  })

  it('redirects login page to admin when session is valid', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { userId: 1, role: 'admin', name: 'Admin' } })
    const request = new NextRequest('http://localhost:3000/login', {
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
    })
    request.cookies.set('session', 'valid-token')

    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin')
  })

  it('allows admin route when token name is non-ascii', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { userId: 2, role: 'moderator', name: '부방장' } })
    const request = new NextRequest('http://localhost:3000/admin', {
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
    })
    request.cookies.set('session', 'valid-token')

    const response = await proxy(request)

    expect(response.status).toBe(200)
  })

})
