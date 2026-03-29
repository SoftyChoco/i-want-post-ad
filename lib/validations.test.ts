import { describe, expect, it } from 'vitest'
import { adSubmitSchema, createModeratorSchema, loginSchema, reviewSchema } from '@/lib/validations'

describe('loginSchema', () => {
  it('accepts valid credentials and rejects invalid email', () => {
    expect(
      loginSchema.safeParse({ email: 'admin@example.com', password: 'secret' }).success
    ).toBe(true)

    expect(loginSchema.safeParse({ email: 'not-email', password: 'secret' }).success).toBe(false)
  })
})

describe('adSubmitSchema', () => {
  const validPayload = {
    applicantName: 'tester',
    applicantContact: 'user@example.com',
    contentType: '교육/강의',
    contentBody: '1234567890 유효한 본문',
    contentUrl: '',
    acknowledgedPolicy: true,
  }

  it('normalizes contentUrl to https when scheme is missing', () => {
    const result = adSubmitSchema.parse({ ...validPayload, contentUrl: 'example.com/path' })
    expect(result.contentUrl).toBe('https://example.com/path')
  })

  it('rejects invalid applicantContact email and short content', () => {
    const invalidEmail = adSubmitSchema.safeParse({ ...validPayload, applicantContact: 'bad-email' })
    const shortBody = adSubmitSchema.safeParse({ ...validPayload, contentBody: 'short' })

    expect(invalidEmail.success).toBe(false)
    expect(shortBody.success).toBe(false)
  })

  it('rejects submission when mandatory acknowledgements are missing', () => {
    const missingPolicyAck = adSubmitSchema.safeParse({ ...validPayload, acknowledgedPolicy: false })

    expect(missingPolicyAck.success).toBe(false)
  })
})

describe('reviewSchema', () => {
  it('accepts approved/rejected only', () => {
    expect(reviewSchema.safeParse({ status: 'approved', reason: 'ok' }).success).toBe(true)
    expect(reviewSchema.safeParse({ status: 'rejected', reason: 'no' }).success).toBe(true)
    expect(reviewSchema.safeParse({ status: 'pending', reason: 'x' }).success).toBe(false)
  })
})

describe('createModeratorSchema', () => {
  it('accepts email and name without password input', () => {
    expect(
      createModeratorSchema.safeParse({
        email: 'mod@example.com',
        name: 'mod',
      }).success
    ).toBe(true)

    expect(
      createModeratorSchema.safeParse({
        email: 'not-email',
        name: 'mod',
      }).success
    ).toBe(false)
  })
})
