import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { isSameOriginUiRequestFromHeaders } from '@/lib/api-origin-guard'
import { getJwtSecretBytes } from '@/lib/env'
import { encodeActorNameHeaderValue } from '@/lib/request-actor'

function isSameOriginUiRequest(request: NextRequest): boolean {
  return isSameOriginUiRequestFromHeaders({
    expectedOrigin: request.nextUrl.origin,
    expectedHost: request.headers.get('host'),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
  })
}

export async function proxy(request: NextRequest) {
  let secret: Uint8Array
  try {
    secret = getJwtSecretBytes()
  } catch (error) {
    console.error('Proxy secret configuration error:', error)
    return NextResponse.json(
      { error: { code: 'MISCONFIGURED', message: 'JWT secret is not configured correctly' } },
      { status: 500 }
    )
  }

  const { pathname } = request.nextUrl
  const token = request.cookies.get('session')?.value
  const isAnyApiRoute = pathname.startsWith('/api/')
  const isApiRoute = pathname.startsWith('/api/admin')
  const isInternalMaintenanceApi = pathname.startsWith('/api/internal/maintenance')
  const isHealthApi = pathname.startsWith('/api/health')
  const isAdminPage = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/login'

  if (isAnyApiRoute && !isInternalMaintenanceApi && !isHealthApi && !isSameOriginUiRequest(request)) {
    return NextResponse.json(
      { error: { code: 'DIRECT_API_BLOCKED', message: '직접 API 호출은 허용되지 않습니다' } },
      { status: 403 }
    )
  }

  if (isLoginPage && token) {
    try {
      await jwtVerify(token, secret)
      return NextResponse.redirect(new URL('/admin', request.url))
    } catch {}
  }

  if (isAdminPage || isApiRoute) {
    if (!token) {
      if (isApiRoute) {
        return NextResponse.json(
          { error: { code: 'AUTH_REQUIRED', message: '인증이 필요합니다' } },
          { status: 401 }
        )
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      const { payload } = await jwtVerify(token, secret)
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', String(payload.userId))
      requestHeaders.set('x-user-role', String(payload.role))
      requestHeaders.set('x-user-name', encodeActorNameHeaderValue(String(payload.name)))

      return NextResponse.next({ request: { headers: requestHeaders } })
    } catch {
      const response = isApiRoute
        ? NextResponse.json(
            { error: { code: 'AUTH_INVALID_TOKEN', message: '유효하지 않은 토큰입니다' } },
            { status: 401 }
          )
        : NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('session')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*', '/login'],
}
