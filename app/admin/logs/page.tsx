import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuditLogRepo } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { formatAuditDetail } from './log-detail'

type AuditLogRow = {
  id: number
  action: string
  targetType: string
  targetId: number | null
  actorName: string
  details: string | null
  createdAt: Date
}

const actionBadge: Record<string, { label: string; color: string }> = {
  approve: { label: '승인', color: 'bg-green-100 text-green-800' },
  reject: { label: '거절', color: 'bg-red-100 text-red-800' },
  rejudge: { label: '재판정', color: 'bg-sky-100 text-sky-800' },
  create_mod: { label: '부방장 추가', color: 'bg-blue-100 text-blue-800' },
  delete_mod: { label: '부방장 삭제', color: 'bg-gray-100 text-gray-600' },
  reset_mod_password: { label: '부방장 비밀번호 초기화', color: 'bg-orange-100 text-orange-800' },
  change_password: { label: '비밀번호 변경', color: 'bg-violet-100 text-violet-800' },
  create_chat_schedule: { label: '채팅 스케줄 생성', color: 'bg-sky-100 text-sky-800' },
  update_chat_schedule: { label: '채팅 스케줄 수정', color: 'bg-cyan-100 text-cyan-800' },
  delete_chat_schedule: { label: '채팅 스케줄 삭제', color: 'bg-rose-100 text-rose-800' },
  create_chat_direct: { label: '직접 메시지 작성', color: 'bg-indigo-100 text-indigo-800' },
  create_chat_trigger_rule: { label: '자동응답 룰 생성', color: 'bg-emerald-100 text-emerald-800' },
  update_chat_trigger_rule: { label: '자동응답 룰 수정', color: 'bg-teal-100 text-teal-800' },
  delete_chat_trigger_rule: { label: '자동응답 룰 삭제', color: 'bg-amber-100 text-amber-800' },
}

export default async function LogsPage({
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
  const page = Math.max(1, Number(sp.page) || 1)
  const limit = 20

  const repo = await getAuditLogRepo()
  const [rows, total] = await repo.findAndCount({
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  })
  const logs = rows as AuditLogRow[]

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">감사 로그</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">← 목록으로</Link>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 text-left text-gray-600 bg-gray-50">
            <th className="py-3 px-4 font-medium">시간</th><th className="py-3 px-4 font-medium">액션</th>
            <th className="py-3 px-4 font-medium">대상</th><th className="py-3 px-4 font-medium">실행자</th><th className="py-3 px-4 font-medium">상세</th>
          </tr></thead>
          <tbody>
            {logs.map(log => {
              const ab = actionBadge[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' }
              const details = formatAuditDetail(log.action, log.details)
              return (
                <tr key={log.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-500 text-xs">{new Date(log.createdAt).toLocaleString('ko-KR')}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 text-xs rounded-full ${ab.color}`}>{ab.label}</span></td>
                  <td className="py-3 px-4 text-xs">{log.targetType} #{log.targetId}</td>
                  <td className="py-3 px-4">{log.actorName}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs max-w-xs truncate">{details}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && <Link href={`/admin/logs?page=${page - 1}`} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">이전</Link>}
          <span className="px-4 py-2 text-sm text-gray-600">{page} / {totalPages}</span>
          {page < totalPages && <Link href={`/admin/logs?page=${page + 1}`} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">다음</Link>}
        </div>
      )}
    </div>
  )
}
