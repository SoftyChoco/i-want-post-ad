'use client'

import { useState } from 'react'

const CONTENT_TYPES = [
  { value: '', label: '선택해주세요' },
  { value: '교육/강의', label: '교육/강의' },
  { value: '개발 도구/서비스', label: '개발 도구/서비스' },
  { value: '채용 공고', label: '채용 공고' },
  { value: '기술 서적', label: '기술 서적' },
  { value: '기타', label: '기타' },
]

type Verdict = 'compliant' | 'non_compliant' | 'needs_review' | 'error'

interface SubmitResult {
  requestCode: string
  llmStatus?: 'processing' | 'completed'
  llmVerdict?: Verdict | null
  llmReason?: string | null
  llmSuggestion?: string | null
}

const VERDICT_STYLES: Record<Verdict, { bg: string; text: string; label: string }> = {
  compliant: { bg: 'bg-green-100', text: 'text-green-800', label: '정책 부합' },
  non_compliant: { bg: 'bg-red-100', text: 'text-red-800', label: '정책 위반 가능' },
  needs_review: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '검토 필요' },
  error: { bg: 'bg-gray-100', text: 'text-gray-800', label: '자동 판정 실패' },
}

export default function SubmitPage() {
  const [form, setForm] = useState({
    applicantName: '',
    applicantContact: '',
    contentType: '',
    contentBody: '',
    contentUrl: '',
    acknowledgedPolicy: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [copied, setCopied] = useState(false)

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateCheckbox(field: 'acknowledgedPolicy', checked: boolean) {
    setForm((prev) => ({ ...prev, [field]: checked }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/ads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error?.message || '제출에 실패했습니다')
        return
      }

      setResult(data)
    } catch {
      setError('서버에 연결할 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  async function copyCode() {
    if (!result) return
    await navigator.clipboard.writeText(result.requestCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (result) {
    const hasJudgment = Boolean(result.llmVerdict && result.llmReason)
    const style = result.llmVerdict ? (VERDICT_STYLES[result.llmVerdict] || VERDICT_STYLES.error) : null
    return (
      <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-md p-6 space-y-5">
          <h2 className="text-xl font-bold text-center">광고 심사 접수 완료</h2>

          <div className="bg-gray-50 rounded-md p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">접수 번호</p>
              <p className="text-lg font-mono font-bold">{result.requestCode}</p>
            </div>
            <button
              onClick={copyCode}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            >
              {copied ? '복사됨!' : '복사'}
            </button>
          </div>

          {hasJudgment && style ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">AI 판정:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">판정 사유</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-md p-3">{result.llmReason}</p>
              </div>
              {result.llmSuggestion && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">수정 제안</p>
                  <p className="text-sm text-blue-700 bg-blue-50 rounded-md p-3">{result.llmSuggestion}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-800">
              AI 정책 판정은 비동기로 진행 중입니다. 최대 1분 정도 소요될 수 있으니 심사 현황 조회에서 결과를 확인해 주세요.
            </div>
          )}

          <div className="pt-2 space-y-2">
            <a
              href="/status"
              className="block w-full text-center py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              심사 현황 조회
            </a>
            <button
              onClick={() => {
                setResult(null)
                setForm({
                  applicantName: '',
                  applicantContact: '',
                  contentType: '',
                  contentBody: '',
                  contentUrl: '',
                  acknowledgedPolicy: false,
                })
              }}
              className="block w-full text-center py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              새 광고 접수
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-4">
        <a
          href="/llms.txt"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-3 px-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          📋 광고 정책을 먼저 확인해주세요
        </a>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center mb-6">광고 심사 신청</h1>

          <section className="mb-5 space-y-3 text-sm">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <h2 className="font-semibold mb-2">제출 전 필수 안내 (반드시 확인)</h2>
              <h3 className="font-medium mb-2">정책 핵심</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-200 text-amber-900">필수</span>
                  <span>요청코드는 <strong>해당 신청 건에만</strong> 유효합니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-200 text-amber-900">주의</span>
                  <span>AI 정책 통과와 별개로 운영진은 <strong>승인을 거절</strong>할 수 있습니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-200 text-amber-900">시간</span>
                  <span>승인된 요청코드는 승인 시점 기준 <strong>24시간</strong> 이후 만료됩니다.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900">
              <h3 className="font-medium mb-2">제재 가능 사유</h3>
              <p className="mb-2">아래 항목에 해당하면 승인되더라도 가리기 또는 강퇴될 수 있습니다.</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="applicantName" className="block text-sm font-medium text-gray-700 mb-1">
                오픈채팅 닉네임
              </label>
              <input
                id="applicantName"
                type="text"
                value={form.applicantName}
                onChange={(e) => updateField('applicantName', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="홍길동"
              />
              <p className="mt-1 text-xs text-gray-500">고유한 닉네임으로 설정해 주세요.</p>
            </div>

            <div>
              <label htmlFor="applicantContact" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                id="applicantContact"
                type="email"
                value={form.applicantContact}
                onChange={(e) => updateField('applicantContact', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                autoComplete="email"
              />
              <p className="mt-1 text-xs text-gray-500">심사 현황은 입력하신 이메일 주소로 조회하니 정확히 입력해 주세요.</p>
            </div>

            <div>
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-1">
                콘텐츠 유형
              </label>
              <select
                id="contentType"
                value={form.contentType}
                onChange={(e) => updateField('contentType', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="contentBody" className="block text-sm font-medium text-gray-700 mb-1">
                오픈채팅 포스팅 본문
              </label>
              <textarea
                id="contentBody"
                value={form.contentBody}
                onChange={(e) => updateField('contentBody', e.target.value)}
                required
                maxLength={2000}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="안녕하세요! 오픈채팅에 게시할 광고 메시지 본문을 그대로 입력해 주세요. 안내 문구, 참여 방법, 링크를 포함해도 됩니다."
              />
            </div>

            <div>
              <label htmlFor="contentUrl" className="block text-sm font-medium text-gray-700 mb-1">
                URL <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <input
                id="contentUrl"
                type="url"
                value={form.contentUrl}
                onChange={(e) => updateField('contentUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.acknowledgedPolicy}
                  onChange={(e) => updateCheckbox('acknowledgedPolicy', e.target.checked)}
                  className="mt-0.5"
                />
                <span>위 정책 안내를 확인했고, 승인 후에도 운영진 판단에 따라 제한될 수 있음을 이해했습니다.</span>
              </label>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || !form.acknowledgedPolicy}
              className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'AI가 정책을 검토하고 있습니다...' : '심사 신청'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
