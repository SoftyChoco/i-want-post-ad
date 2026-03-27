import { NextResponse } from 'next/server'
import { getPolicyContent } from '@/lib/policy'

export async function GET() {
  try {
    const content = await getPolicyContent()
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('llms.txt route error:', error)
    return new NextResponse('정책을 불러오는 중 오류가 발생했습니다', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }
}
