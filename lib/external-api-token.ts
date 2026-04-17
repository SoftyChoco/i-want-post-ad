export function getExternalApiToken(): string {
  return (process.env.KAKAO_BOT_TOKEN || '').trim()
}

export function hasValidExternalApiToken(authHeader: string | null): boolean {
  const token = getExternalApiToken()
  if (!token) return false

  const rawHeader = (authHeader || '').trim()
  const match = /^Bearer\s+(.+)$/i.exec(rawHeader)
  if (!match) return false

  const requestToken = match[1]?.trim() || ''
  return requestToken === token
}
