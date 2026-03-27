import { SignJWT } from 'jose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!)

async function signToken(payload: any): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(getSecret())
}

async function main() {
  const adminToken = await signToken({
    userId: 1,
    email: 'softychoco@kakao.com',
    role: 'admin',
    name: '방장',
  })

  const moderatorToken = await signToken({
    userId: 2,
    email: 'mod@example.com',
    role: 'moderator',
    name: '부방장',
  })

  console.log(`ADMIN_TOKEN=${adminToken}`)
  console.log(`MODERATOR_TOKEN=${moderatorToken}`)
}

main().catch(console.error)
