import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">광고 신청 시스템</h1>
      <p className="text-gray-500 mb-10 text-center">오픈채팅방 광고 정책 안내 및 신청</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full mb-12">
        <a href="/llms.txt" target="_blank" rel="noopener noreferrer"
          className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-center">
          <div className="text-3xl mb-3">📋</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">광고 정책 확인</h2>
          <p className="text-sm text-gray-500">허용/금지 카테고리와 작성 규칙을 확인하세요</p>
        </a>
        <Link href="/submit"
          className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-center">
          <div className="text-3xl mb-3">✏️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">광고 신청하기</h2>
          <p className="text-sm text-gray-500">광고 내용을 제출하고 AI 사전 검토를 받으세요</p>
        </Link>
        <Link href="/status"
          className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-center">
          <div className="text-3xl mb-3">🔍</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">신청 내역 조회</h2>
          <p className="text-sm text-gray-500">이메일 주소로 내 광고 신청 상태를 확인하세요</p>
        </Link>
      </div>
      <div className="max-w-2xl text-center">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">이용 안내</h3>
        <ol className="text-sm text-gray-500 space-y-1 text-left list-decimal list-inside">
          <li>광고 정책을 확인하거나 LLM에 정책을 전달해 사전 점검합니다.</li>
          <li>오픈채팅방에 올릴 최종 본문과 동일하게 광고를 신청합니다.</li>
          <li>관리자 승인 결과를 기다린 뒤 신청 내역 조회에서 결과를 확인합니다.</li>
          <li>승인 시 요청코드를 게시글 최상단에 포함해 24시간 내 게시합니다.</li>
        </ol>
      </div>
    </div>
  )
}
