export const REQUEST_CODE_EXPIRY_MS = 24 * 60 * 60 * 1000

export function getRequestCodeExpiryAt(reviewedAt: Date | string | null): Date | null {
  if (!reviewedAt) return null
  const reviewedMs = new Date(reviewedAt).getTime()
  if (Number.isNaN(reviewedMs)) return null
  return new Date(reviewedMs + REQUEST_CODE_EXPIRY_MS)
}

export function isRequestCodeExpired(
  status: string,
  reviewedAt: Date | string | null,
  now: number = Date.now()
): boolean {
  if (status !== 'approved') return false
  const expiryAt = getRequestCodeExpiryAt(reviewedAt)
  if (!expiryAt) return false
  return now > expiryAt.getTime()
}
