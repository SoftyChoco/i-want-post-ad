import { NextRequest, NextResponse } from 'next/server'
import { getUserRepo } from '@/lib/db'
import { loginSchema } from '@/lib/validations'
import { comparePassword, signToken } from '@/lib/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit(ip, 'login')
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다' } },
        { status: 400 }
      )
    }

    const userRepo = await getUserRepo()
    const user = await userRepo.findOneBy({ email: parsed.data.email })
    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTH_INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다' } },
        { status: 401 }
      )
    }

    const valid = await comparePassword(parsed.data.password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: { code: 'AUTH_INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다' } },
        { status: 401 }
      )
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'admin' | 'moderator',
      name: user.name,
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
      secure: process.env.NODE_ENV === 'production',
    })
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
