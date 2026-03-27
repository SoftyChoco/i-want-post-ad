import Link from 'next/link'

export default function RequestNotFound() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">요청을 찾을 수 없습니다</h1>
      <p className="text-gray-500 mb-6 text-sm">삭제되었거나 존재하지 않는 요청입니다</p>
      <Link href="/admin" className="text-blue-600 hover:underline text-sm">목록으로 돌아가기</Link>
    </div>
  )
}
