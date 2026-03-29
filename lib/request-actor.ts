export function encodeActorNameHeaderValue(name: string): string {
  return encodeURIComponent(name)
}

export function decodeActorNameHeaderValue(value: string | null): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function getActorFromHeaders(headers: Headers): {
  userId: number
  role: string
  name: string
} {
  return {
    userId: Number(headers.get('x-user-id')),
    role: headers.get('x-user-role') || '',
    name: decodeActorNameHeaderValue(headers.get('x-user-name')),
  }
}
