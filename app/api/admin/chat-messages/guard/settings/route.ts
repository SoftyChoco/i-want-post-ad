import { NextRequest, NextResponse } from 'next/server'
import { getActorFromHeaders } from '@/lib/request-actor'
import { getAutoReplyGuardSettings, updateAutoReplyGuardSettings } from '@/lib/chat-auto-reply-guard'
import { updateAutoReplyGuardSettingsSchema } from '@/lib/validations'

function ensureAdminOrModerator(request: NextRequest) {
  const actor = getActorFromHeaders(request.headers)
  if (actor.role !== 'admin' && actor.role !== 'moderator') return null
  return actor
}

export async function GET(request: NextRequest) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }, { status: 403 })
    }

    const settings = await getAutoReplyGuardSettings()
    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('Auto-reply guard settings get error:', error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateAutoReplyGuardSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다' },
      }, { status: 400 })
    }

    await updateAutoReplyGuardSettings(parsed.data)
    return NextResponse.json({ data: parsed.data })
  } catch (error) {
    console.error('Auto-reply guard settings patch error:', error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } }, { status: 500 })
  }
}
