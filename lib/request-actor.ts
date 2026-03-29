export function encodeActorNameHeaderValue(name: string): string {
  return Buffer.from(name, 'utf8').toString('base64url')
}

export function decodeActorNameHeaderValue(value: string | null): string {
  if (!value) return ''
  if (value.includes('%')) {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  try {
    return Buffer.from(value, 'base64url').toString('utf8')
  } catch {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
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
