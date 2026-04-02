import { NextRequest, NextResponse } from 'next/server'
import { getUserRepo, getDb } from '@/lib/db'
import { getActorFromHeaders } from '@/lib/request-actor'
import { hashPassword } from '@/lib/auth'
import { generateTemporaryPassword } from '@/lib/password'
import { User } from '@/lib/entities/User'
import { AuditLog } from '@/lib/entities/AuditLog'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = getActorFromHeaders(request.headers)
    if (actor.role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장만 부방장 비밀번호를 초기화할 수 있습니다' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const targetId = Number(id)
    const actorId = actor.userId

    if (targetId === actorId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '자기 자신의 비밀번호는 이 경로로 초기화할 수 없습니다' } },
        { status: 403 }
      )
    }

    const userRepo = await getUserRepo()
    const targetUser = await userRepo.findOneBy({ id: targetId })
    if (!targetUser) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    if (targetUser.role === 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장 비밀번호는 초기화할 수 없습니다' } },
        { status: 403 }
      )
    }

    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await hashPassword(temporaryPassword)

    const db = await getDb()
    await db.transaction(async (manager) => {
      await manager.getRepository(User).update({ id: targetId }, { passwordHash })

      const log = manager.getRepository(AuditLog).create({
        action: 'reset_mod_password',
        targetType: 'user',
        targetId,
        actorId,
        actorName: actor.name,
        details: JSON.stringify({ name: targetUser.name }),
      })
      await manager.save(AuditLog, log)
    })

    return NextResponse.json({
      message: '부방장 비밀번호가 초기화되었습니다',
      temporaryPassword,
      name: targetUser.name,
      email: targetUser.email,
    })
  } catch (error) {
    console.error('Reset moderator password error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = getActorFromHeaders(request.headers)
    const role = actor.role
    if (role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장만 부방장을 삭제할 수 있습니다' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const targetId = Number(id)
    const actorId = actor.userId

    if (targetId === actorId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '자기 자신은 삭제할 수 없습니다' } },
        { status: 403 }
      )
    }

    const userRepo = await getUserRepo()
    const targetUser = await userRepo.findOneBy({ id: targetId })

    if (!targetUser) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    if (targetUser.role === 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장은 삭제할 수 없습니다' } },
        { status: 403 }
      )
    }

    const userName = actor.name

    const db = await getDb()
    await db.transaction(async (manager) => {
      const log = manager.getRepository(AuditLog).create({
        action: 'delete_mod',
        targetType: 'user',
        targetId,
        actorId,
        actorName: userName,
        details: JSON.stringify({ name: targetUser.name }),
      })
      await manager.save(AuditLog, log)
      await manager.remove(targetUser)
    })

    return NextResponse.json({ message: '삭제되었습니다' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
