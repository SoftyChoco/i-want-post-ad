import crypto from 'crypto'

function getDateStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function randomHex4(): string {
  return crypto.randomBytes(2).toString('hex').toUpperCase()
}

export function generateRequestCode(): string {
  return `REQ-${getDateStr()}-${randomHex4()}`
}
