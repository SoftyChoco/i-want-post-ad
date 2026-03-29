import { NextRequest, NextResponse } from 'next/server'
import { getUserRepo, getDb } from '@/lib/db'
import { createModeratorSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/auth'
import { getActorFromHeaders } from '@/lib/request-actor'
import { generateTemporaryPassword } from '@/lib/password'

export async function GET(request: NextRequest) {
  try {
    const actor = getActorFromHeaders(request.headers)
    const role = actor.role
    if (role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장만 부방장 목록을 볼 수 있습니다' } },
        { status: 403 }
      )
    }

    const repo = await getUserRepo()
    const users = await repo.find({
      order: { createdAt: 'DESC' },
      select: ['id', 'email', 'name', 'role', 'createdAt'],
    })
    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('Users list error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = getActorFromHeaders(request.headers)
    const role = actor.role
    if (role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장만 부방장을 추가할 수 있습니다' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createModeratorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다' } },
        { status: 400 }
      )
    }

    const userRepo = await getUserRepo()
    const existing = await userRepo.findOneBy({ email: parsed.data.email })
    if (existing) {
      return NextResponse.json(
        { error: { code: 'DUPLICATE_EMAIL', message: '이미 등록된 이메일입니다' } },
        { status: 409 }
      )
    }

    const userId = actor.userId
    const userName = actor.name
    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await hashPassword(temporaryPassword)

    let newUser: any
    const db = await getDb()
    await db.transaction(async (manager) => {
      const user = manager.getRepository('User').create({
        email: parsed.data.email,
        passwordHash,
        name: parsed.data.name,
        role: 'moderator',
      })
      newUser = await manager.save('User', user)

      const log = manager.getRepository('AuditLog').create({
        action: 'create_mod',
        targetType: 'user',
        targetId: newUser.id,
        actorId: userId,
        actorName: userName,
        details: JSON.stringify({ name: parsed.data.name }),
      })
      await manager.save('AuditLog', log)
    })

    return NextResponse.json(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        temporaryPassword,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create moderator error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
