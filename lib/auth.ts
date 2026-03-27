import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { getJwtSecretBytes } from '@/lib/env'

export interface JWTPayload {
  userId: number
  email: string
  role: 'admin' | 'moderator'
  name: string
}

const getSecret = () => getJwtSecretBytes()

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
