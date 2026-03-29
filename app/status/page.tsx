'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function StatusContent() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<LookupResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  interface LookupResult {
    requestCode: string
    applicantName: string
    applicantEmail: string
    contentType: string
    contentBody: string
    contentUrl: string | null
    llmStatus: 'processing' | 'done' | 'failed'
    llmVerdict: 'compliant' | 'non_compliant' | 'needs_review' | 'error' | null
    llmReason: string | null
    status: string
    createdAt: string
    reviewedAt: string | null
    rejectionReasonSummary: string | null
  }

  const handleLookup = async (lookupQuery: string) => {
    const trimmed = lookupQuery.trim()
    if (!trimmed) return
    
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch(`/api/requests/by-contact?query=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (res.ok) {
        setResults(data.data || [])
      } else {
        setError(data.error?.message || '조회 중 오류가 발생했습니다')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const queryParam =
      searchParams.get('query') ||
      searchParams.get('contact') ||
      searchParams.get('requestCode') ||
      searchParams.get('code')
    if (queryParam) {
      const normalizedQuery = queryParam.trim()
      setQuery(normalizedQuery)
      handleLookup(normalizedQuery)
    }
  }, [searchParams])

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">신청 내역 조회</h1>
      <p className="text-sm text-gray-500 text-center mb-4">
        요청코드 또는 신청 이메일 주소로 신청 내역을 확인할 수 있습니다.
      </p>

      <div className="flex gap-2 mb-8 max-w-md mx-auto">
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="REQ-20260322-ABCD 또는 you@example.com"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onKeyDown={(e) => e.key === 'Enter' && handleLookup(query)}
          autoComplete="off"
        />
        <button 
          onClick={() => handleLookup(query)}
          disabled={loading || !query.trim()}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '조회중...' : '조회'}
        </button>
      </div>

      <section className="mb-6 space-y-3 text-sm">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <h2 className="font-semibold mb-2">조회 전 필수 안내</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-200 text-amber-900">주의</span>
              <span>AI가 <strong>정책 부합</strong>이어도 운영진의 <strong>최종 승인 전에는 게시하면 안 됩니다</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-200 text-amber-900">시간</span>
              <span>승인된 요청코드는 승인 시점 기준 <strong>24시간</strong> 이후 만료됩니다.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900">
          <h3 className="font-medium mb-2">제재 가능 사유</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-200 text-rose-900">제재</span>
              <span>홍보 내용 상단에 <strong>요청코드 미기입</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-200 text-rose-900">제재</span>
              <span>정책 통과 후에도 <strong>운영상 위험 요소</strong>가 확인됨</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-200 text-rose-900">제재</span>
              <span>동일 요청코드로 <strong>반복 광고</strong> 진행</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-200 text-rose-900">제재</span>
              <span>광고 신청 정보 <strong>불성실 작성</strong></span>
            </li>
          </ul>
        </div>
      </section>

      {loading && (
        <div className="text-center py-12 text-gray-500">조회 중입니다...</div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && results !== null && results.length === 0 && (
        <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">입력한 요청코드 또는 이메일로 조회된 내역이 없습니다.</p>
        </div>
      )}

      {!loading && !error && results && results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">조회 결과 ({results.length}건)</h2>
          {results.map((item) => (
            <div key={item.requestCode} className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs text-gray-400 mb-1">요청코드</div>
                  <div className="font-mono font-bold text-gray-800">{item.requestCode}</div>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.status === 'approved' ? 'bg-green-100 text-green-800' :
                    item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.status === 'approved' ? '승인완료' :
                     item.status === 'rejected' ? '승인거절' :
                     item.status === 'pending' ? (item.llmStatus === 'processing' ? 'AI 판정 진행중' : '관리자 최종 검토중') : item.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                <div>
                  <div className="text-gray-500 text-xs">신청 일시</div>
                  <div className="text-gray-700">{new Date(item.createdAt).toLocaleString('ko-KR')}</div>
                </div>
                {item.reviewedAt && (
                  <div>
                    <div className="text-gray-500 text-xs">처리 일시</div>
                    <div className="text-gray-700">{new Date(item.reviewedAt).toLocaleString('ko-KR')}</div>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-100 text-sm space-y-2">
                <div>
                  <div className="text-gray-500 text-xs">오픈채팅 닉네임</div>
                  <div className="text-gray-700">{item.applicantName}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">신청 이메일</div>
                  <div className="text-gray-700">{item.applicantEmail}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">콘텐츠 유형</div>
                  <div className="text-gray-700">{item.contentType}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">게시 본문</div>
                  <div className="text-gray-700 whitespace-pre-wrap">{item.contentBody}</div>
                </div>
                {item.contentUrl && (
                  <div>
                    <div className="text-gray-500 text-xs">URL</div>
                    <a href={item.contentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                      {item.contentUrl}
                    </a>
                  </div>
                )}
              </div>

              {item.status === 'pending' && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                  <div className="text-amber-900 font-bold mb-1">관리자 최종 검토중</div>
                  <div className="text-amber-800">
                    AI 결과와 별개로 최종 승인 전에는 게시할 수 없습니다.
                  </div>
                </div>
              )}

              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded text-sm">
                <div className="text-blue-800 font-bold mb-1">AI 자동 판정</div>
                <div className="text-blue-700 mb-1">
                  {item.llmStatus === 'processing' && '판정 진행중 (최대 1분 내 반영)'}
                  {item.llmStatus === 'failed' && '자동 판정 실패'}
                  {item.llmVerdict === 'compliant' && '정책 부합'}
                  {item.llmVerdict === 'non_compliant' && '정책 위반 가능'}
                  {item.llmVerdict === 'needs_review' && '추가 검토 필요'}
                  {item.llmVerdict === 'error' && '자동 판정 실패'}
                </div>
                {item.llmReason && <div className="text-blue-700 whitespace-pre-wrap">{item.llmReason}</div>}
              </div>

              {item.status === 'rejected' && item.rejectionReasonSummary && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded text-sm">
                  <div className="text-red-800 font-bold mb-1">거절 사유</div>
                  <div className="text-red-700 whitespace-pre-wrap">{item.rejectionReasonSummary}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-center mt-12">
        <a href="/" className="text-sm text-blue-600 hover:underline">홈으로 돌아가기</a>
      </div>
    </div>
  )
}

export default function StatusPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-12 text-center text-gray-500">로딩중...</div>}>
      <StatusContent />
    </Suspense>
  )
}
