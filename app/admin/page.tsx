import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdRequestRepo } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { resolveLlmStatus } from '@/lib/llm-status'
import LogoutButton from './components/LogoutButton'
import AutoRefreshOnProcessing from './components/AutoRefreshOnProcessing'
import { LessThan, Like } from 'typeorm'
import { REQUEST_CODE_EXPIRY_MS, getRequestCodeExpiryAt, isRequestCodeExpired } from '@/lib/request-code-expiry'

type AdminListRequestRow = {
  id: number
  requestCode: string
  applicantName: string
  contentType: string
  contentTitle: string | null
  status: string
  llmStatus: string | null
  llmVerdict: string | null
  reviewedAt: Date | null
  createdAt: Date
}

const verdictBadge: Record<string, { label: string; color: string }> = {
  compliant: { label: '정책 부합', color: 'bg-green-100 text-green-800' },
  non_compliant: { label: '정책 위반', color: 'bg-red-100 text-red-800' },
  needs_review: { label: '검토 필요', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '판정 진행중', color: 'bg-blue-100 text-blue-800' },
  error: { label: '판정 실패', color: 'bg-gray-100 text-gray-600' },
}

const statusBadge: Record<string, { label: string; color: string }> = {
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인', color: 'bg-green-100 text-green-800' },
  rejected: { label: '거절', color: 'bg-red-100 text-red-800' },
}

const tabs = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기중' },
  { key: 'approved', label: '승인' },
  { key: 'expired', label: '만료' },
  { key: 'rejected', label: '거절' },
]

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/login')
  const user = await verifyToken(token)
  if (!user) redirect('/login')

  const sp = await searchParams
  const statusFilter = (typeof sp.status === 'string' ? sp.status : 'pending')
  const requestCodeFilter = (typeof sp.requestCode === 'string' ? sp.requestCode : '').trim().toUpperCase()
  const page = Math.max(1, Number(sp.page) || 1)
  const limit = 20

  const repo = await getAdRequestRepo()
  const where: Record<string, unknown> = {}
  if (statusFilter === 'expired') {
    where.status = 'approved'
    where.reviewedAt = LessThan(new Date(Date.now() - REQUEST_CODE_EXPIRY_MS))
  } else if (statusFilter !== 'all') {
    where.status = statusFilter
  }
  if (requestCodeFilter) {
    where.requestCode = Like(`%${requestCodeFilter}%`)
  }

  const [rows, total] = await repo.findAndCount({
    where,
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
    relations: ['reviewedBy'],
  })
  const requests = rows as AdminListRequestRow[]

  const totalPages = Math.ceil(total / limit)
  const hasProcessing = requests.some((r) => resolveLlmStatus(r.llmStatus, r.llmVerdict) === 'processing')

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <AutoRefreshOnProcessing enabled={hasProcessing} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">게시 요청 관리</h1>
          <span className="text-sm text-gray-600">{user.name}</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
            {user.role === 'admin' ? '방장' : '부방장'}
          </span>
        </div>
        <LogoutButton />
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <Link
            key={tab.key}
            href={`/admin?status=${tab.key}${requestCodeFilter ? `&requestCode=${encodeURIComponent(requestCodeFilter)}` : ''}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <section className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <h2 className="font-semibold mb-2">운영 가이드</h2>
        <p className="mb-3">
          LLM 판정이 <strong>정책 부합</strong>이더라도 자동 승인되지 않습니다. 최종 승인은 운영진(방장/부방장) 검토가 필요합니다.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>요청코드는 신청 건별 1회 기준으로 사용되며, 승인 시점 기준 24시간 이후 만료됩니다.</li>
          <li>게시글 상단에 요청코드가 없거나 동일 요청코드로 반복 광고하면 승인 후에도 제한될 수 있습니다.</li>
          <li>신청 내용이 불성실하거나 추후 운영상 위험 요소가 확인되면 정책 통과 건도 거절/제한할 수 있습니다.</li>
        </ul>
      </section>

      <form method="get" className="flex gap-2 mb-6">
        <input type="hidden" name="status" value={statusFilter} />
        <input
          type="text"
          name="requestCode"
          defaultValue={requestCodeFilter}
          placeholder="요청코드 검색 (예: REQ-20260322-ABCD)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">검색</button>
        {requestCodeFilter && (
          <Link href={`/admin?status=${statusFilter}`} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">초기화</Link>
        )}
      </form>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {statusFilter === 'pending' ? '대기중인 요청이 없습니다' : '해당하는 요청이 없습니다'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="py-3 px-3 font-medium">요청코드</th>
                <th className="py-3 px-3 font-medium">오픈채팅 닉네임</th>
                <th className="py-3 px-3 font-medium">유형</th>
                <th className="py-3 px-3 font-medium">게시 제목</th>
                <th className="py-3 px-3 font-medium">LLM 판정</th>
                <th className="py-3 px-3 font-medium">상태</th>
                <th className="py-3 px-3 font-medium">생성일</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => {
                const llmStatus = resolveLlmStatus(r.llmStatus, r.llmVerdict)
                const verdictKey = llmStatus === 'processing' ? 'processing' : (r.llmVerdict || 'error')
                const vb = verdictBadge[verdictKey] || verdictBadge.error
                const expired = isRequestCodeExpired(r.status, r.reviewedAt)
                const sb = expired ? { label: '만료', color: 'bg-gray-200 text-gray-700' } : (statusBadge[r.status] || statusBadge.pending)
                const expiryAt = getRequestCodeExpiryAt(r.reviewedAt)
                return (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <Link href={`/admin/requests/${r.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                        {r.requestCode}
                      </Link>
                    </td>
                    <td className="py-3 px-3">{r.applicantName}</td>
                    <td className="py-3 px-3">{r.contentType}</td>
                    <td className="py-3 px-3 max-w-xs truncate">{r.contentTitle}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${vb.color}`}>{vb.label}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${sb.color}`}>{sb.label}</span>
                      {r.status === 'approved' && expiryAt && (
                        <div className="mt-1 text-[11px] text-gray-500">
                          {expired ? '만료:' : '만료 예정:'} {expiryAt.toLocaleString('ko-KR')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-500 text-xs">
                      {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <Link href={`/admin?status=${statusFilter}&page=${page - 1}${requestCodeFilter ? `&requestCode=${encodeURIComponent(requestCodeFilter)}` : ''}`} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">이전</Link>
          )}
          <span className="px-4 py-2 text-sm text-gray-600">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/admin?status=${statusFilter}&page=${page + 1}${requestCodeFilter ? `&requestCode=${encodeURIComponent(requestCodeFilter)}` : ''}`} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">다음</Link>
          )}
        </div>
      )}

    </div>
  )
}
