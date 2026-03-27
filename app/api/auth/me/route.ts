import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  if (!token) {
    return NextResponse.json(
      { error: { code: 'AUTH_REQUIRED', message: '인증이 필요합니다' } },
      { status: 401 }
    )
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json(
      { error: { code: 'AUTH_INVALID_TOKEN', message: '유효하지 않은 토큰입니다' } },
      { status: 401 }
    )
  }

  return NextResponse.json({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    name: payload.name,
  })
}
