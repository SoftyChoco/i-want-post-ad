import { NextRequest, NextResponse } from 'next/server'
import { getPolicyContent, setPolicyContent } from '@/lib/policy'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role')
    if (role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장만 정책을 조회할 수 있습니다' } },
        { status: 403 }
      )
    }

    const content = await getPolicyContent()
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Policy read error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '정책을 읽는 중 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role')
    if (role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '방장만 정책을 수정할 수 있습니다' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const content = typeof body?.content === 'string' ? body.content : ''

    if (!content.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '정책 내용이 비어 있습니다' } },
        { status: 400 }
      )
    }

    if (content.length > 100_000) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '정책 내용이 너무 깁니다' } },
        { status: 400 }
      )
    }

    const version = await setPolicyContent(content)

    return NextResponse.json({ ok: true, version })
  } catch (error) {
    console.error('Policy update error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '정책을 저장하는 중 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
