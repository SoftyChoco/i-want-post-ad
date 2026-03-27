'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h1>
      <p className="text-gray-500 mb-6 text-sm">잠시 후 다시 시도해주세요</p>
      <button onClick={reset} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">다시 시도</button>
    </div>
  )
}
