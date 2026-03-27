export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export function getJwtSecretBytes(): Uint8Array {
  const secret = getRequiredEnv('JWT_SECRET')
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long')
  }
  return new TextEncoder().encode(secret)
}
