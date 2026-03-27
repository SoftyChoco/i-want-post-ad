import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <p className="text-gray-600 mb-6">페이지를 찾을 수 없습니다</p>
      <Link href="/" className="text-blue-600 hover:underline text-sm">홈으로 돌아가기</Link>
    </div>
  )
}
