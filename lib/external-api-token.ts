export function getExternalApiToken(): string {
  return process.env.EXTERNAL_API_TOKEN || process.env.KAKAO_BOT_TOKEN || ''
}

export function hasValidExternalApiToken(authHeader: string | null): boolean {
  const token = getExternalApiToken()
  if (!token) return false
  return (authHeader || '') === `Bearer ${token}`
}
