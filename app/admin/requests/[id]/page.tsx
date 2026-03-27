import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdRequestRepo } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { resolveLlmStatus } from '@/lib/llm-status'
import ReviewForm from './ReviewForm'
import RejudgeButton from './RejudgeButton'
import AutoRefreshOnProcessing from '@/app/admin/components/AutoRefreshOnProcessing'
import { getRequestCodeExpiryAt, isRequestCodeExpired } from '@/lib/request-code-expiry'

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

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/login')
  const user = await verifyToken(token)
  if (!user) redirect('/login')

  const { id } = await params
  const repo = await getAdRequestRepo()
  const adRequest = await repo.findOne({
    where: { id: Number(id) },
    relations: ['reviewedBy'],
  })

  if (!adRequest) notFound()

  const llmStatus = resolveLlmStatus(adRequest.llmStatus, adRequest.llmVerdict)
  const expired = isRequestCodeExpired(adRequest.status, adRequest.reviewedAt)
  const expiryAt = getRequestCodeExpiryAt(adRequest.reviewedAt)
  const verdictKey = llmStatus === 'processing' ? 'processing' : (adRequest.llmVerdict || 'error')
  const vb = verdictBadge[verdictKey] || verdictBadge.error
  const sb = expired ? { label: '만료', color: 'bg-gray-200 text-gray-700' } : (statusBadge[adRequest.status] || statusBadge.pending)
  let ruleIds: string[] = []
  try { ruleIds = JSON.parse(adRequest.llmRuleIds || '[]') } catch {}

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <AutoRefreshOnProcessing enabled={llmStatus === 'processing'} />
      <Link href="/admin" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← 목록으로 돌아가기</Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-mono">{adRequest.requestCode}</h1>
        <span className={`px-3 py-1 text-sm rounded-full ${sb.color}`}>{sb.label}</span>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">게시 정보</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><dt className="text-gray-500">오픈채팅 닉네임</dt><dd className="mt-1 font-medium">{adRequest.applicantName}</dd></div>
          <div><dt className="text-gray-500">연락처</dt><dd className="mt-1 font-medium">{adRequest.applicantContact}</dd></div>
          <div><dt className="text-gray-500">콘텐츠 유형</dt><dd className="mt-1 font-medium">{adRequest.contentType}</dd></div>
          <div><dt className="text-gray-500">게시 제목</dt><dd className="mt-1 font-medium">{adRequest.contentTitle}</dd></div>
        </dl>
        <div className="mt-4">
          <dt className="text-sm text-gray-500">게시 내용(전문)</dt>
          <dd className="mt-1 text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-md">{adRequest.contentBody}</dd>
        </div>
        {adRequest.contentUrl && (
          <div className="mt-4">
            <dt className="text-sm text-gray-500">URL</dt>
            <dd className="mt-1"><a href={adRequest.contentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">{adRequest.contentUrl}</a></dd>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">AI 판정 결과</h2>
          {user.role === 'admin' && <RejudgeButton requestId={adRequest.id} isProcessing={llmStatus === 'processing'} />}
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className={`px-3 py-1 text-sm rounded-full ${vb.color}`}>{vb.label}</span>
          {adRequest.policyVersion && <span className="text-xs text-gray-400">정책 v{adRequest.policyVersion}</span>}
        </div>
        {adRequest.llmReason && <p className="text-sm text-gray-700 mb-2">{adRequest.llmReason}</p>}
        {ruleIds.length > 0 && (
          <div className="flex gap-2 mb-2">
            {ruleIds.map((rid: string) => <span key={rid} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded font-mono">{rid}</span>)}
          </div>
        )}
      </section>

      {adRequest.status === 'pending' && <ReviewForm requestId={adRequest.id} />}

      {adRequest.status !== 'pending' && (
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">처리 결과</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-500">처리자</dt><dd className="mt-1 font-medium">{adRequest.reviewedBy?.name || '-'}</dd></div>
            <div><dt className="text-gray-500">처리일</dt><dd className="mt-1 font-medium">{adRequest.reviewedAt ? new Date(adRequest.reviewedAt).toLocaleString('ko-KR') : '-'}</dd></div>
            {adRequest.status === 'approved' && (
              <>
                <div><dt className="text-gray-500">요청코드 상태</dt><dd className="mt-1 font-medium">{expired ? '만료' : '유효'}</dd></div>
                <div><dt className="text-gray-500">만료 시각</dt><dd className="mt-1 font-medium">{expiryAt ? expiryAt.toLocaleString('ko-KR') : '-'}</dd></div>
              </>
            )}
          </dl>
          {adRequest.adminReason && (
            <div className="mt-4"><dt className="text-sm text-gray-500">사유</dt><dd className="mt-1 text-sm">{adRequest.adminReason}</dd></div>
          )}
        </section>
      )}
    </div>
  )
}
