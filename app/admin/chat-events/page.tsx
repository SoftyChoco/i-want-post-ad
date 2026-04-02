import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Like } from 'typeorm'
import { getChatEventRepo } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

type ChatEventRow = {
  id: number
  observedAt: Date
  authorName: string
  content: string
  createdAt: Date
}

function formatUtc(value: Date | string) {
  return new Date(value).toISOString()
}

export default async function ChatEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/login')
  const user = await verifyToken(token)
  if (!user) redirect('/login')

  if (user.role !== 'admin' && user.role !== 'moderator') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-4">권한이 없습니다</p>
        <Link href="/admin" className="text-blue-600 hover:underline">목록으로 돌아가기</Link>
      </div>
    )
  }

  const sp = await searchParams
  const keyword = (typeof sp.keyword === 'string' ? sp.keyword : '').trim()
  const page = Math.max(1, Number(sp.page) || 1)
  const limit = 20

  const repo = await getChatEventRepo()
  const [rows, total] = await repo.findAndCount({
    where: keyword ? { content: Like(`${keyword}%`) } : undefined,
    order: { observedAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  })
  const events = rows as ChatEventRow[]
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">수집된 채팅 메시지</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">← 목록으로</Link>
      </div>

      <form method="get" className="flex gap-2 mb-6">
        <input
          type="text"
          name="keyword"
          defaultValue={keyword}
          placeholder="내용 prefix 검색 (keyword%)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">검색</button>
        {keyword && (
          <Link href="/admin/chat-events" className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">초기화</Link>
        )}
      </form>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600 bg-gray-50">
              <th className="py-3 px-4 font-medium">관찰시각 (UTC)</th>
              <th className="py-3 px-4 font-medium">작성자</th>
              <th className="py-3 px-4 font-medium">내용</th>
              <th className="py-3 px-4 font-medium">수집시각 (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 px-4 text-center text-gray-500">
                  수집된 메시지가 없습니다
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-xs text-gray-500">{formatUtc(event.observedAt)}</td>
                  <td className="py-3 px-4">{event.authorName}</td>
                  <td className="py-3 px-4 max-w-xl break-all">{event.content}</td>
                  <td className="py-3 px-4 text-xs text-gray-500">{formatUtc(event.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={`/admin/chat-events?page=${page - 1}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              이전
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-gray-600">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/admin/chat-events?page=${page + 1}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
