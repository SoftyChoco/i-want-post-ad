import crypto from 'crypto'

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function generateTemporaryPassword(length = 12): string {
  const targetLength = Math.max(8, length)
  const bytes = crypto.randomBytes(targetLength)
  let result = ''

  for (let i = 0; i < targetLength; i += 1) {
    result += CHARSET[bytes[i] % CHARSET.length]
  }

  return result
}
