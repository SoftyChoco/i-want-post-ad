import { NextRequest, NextResponse } from 'next/server'
import { getActorFromHeaders } from '@/lib/request-actor'
import { getOrCreateChatMessageSettings, setChatMessageSettings } from '@/lib/chat-message-settings'
import { updateChatMessageSettingsSchema } from '@/lib/validations'

function ensureAdminOrModerator(request: NextRequest) {
  const actor = getActorFromHeaders(request.headers)
  if (actor.role !== 'admin' && actor.role !== 'moderator') return null
  return actor
}

export async function GET(request: NextRequest) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 설정을 조회할 수 있습니다' } },
        { status: 403 }
      )
    }

    const data = await getOrCreateChatMessageSettings()
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Chat message settings read error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = ensureAdminOrModerator(request)
    if (!actor) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장과 부방장만 설정을 수정할 수 있습니다' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateChatMessageSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다',
          },
        },
        { status: 400 }
      )
    }

    const data = await setChatMessageSettings({
      nightBlockEnabled: parsed.data.nightBlockEnabled,
      nightStart: parsed.data.nightBlockEnabled ? (parsed.data.nightStart || null) : null,
      nightEnd: parsed.data.nightBlockEnabled ? (parsed.data.nightEnd || null) : null,
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Chat message settings update error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
