import { NextRequest, NextResponse } from 'next/server'
import { recoverStaleLlmProcessing } from '@/lib/llm-status'

export async function POST(request: NextRequest) {
  const token = process.env.INTERNAL_MAINTENANCE_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: { code: 'MISCONFIGURED', message: 'INTERNAL_MAINTENANCE_TOKEN is not configured' } },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization') || ''
  const incomingToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (incomingToken !== token) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Invalid maintenance token' } },
      { status: 403 }
    )
  }

  try {
    const recovered = await recoverStaleLlmProcessing()
    return NextResponse.json({ recovered })
  } catch (error) {
    console.error('Recover LLM maintenance error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
