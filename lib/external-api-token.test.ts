import { afterEach, describe, expect, it } from 'vitest'
import { getExternalApiToken, hasValidExternalApiToken } from './external-api-token'

describe('external api token helpers', () => {
  afterEach(() => {
    delete process.env.KAKAO_BOT_TOKEN
  })

  it('trims environment token value', () => {
    process.env.KAKAO_BOT_TOKEN = '  bot-token  '
    expect(getExternalApiToken()).toBe('bot-token')
  })

  it('accepts bearer header with flexible whitespace and case', () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    expect(hasValidExternalApiToken('Bearer bot-token')).toBe(true)
    expect(hasValidExternalApiToken(' bearer    bot-token ')).toBe(true)
    expect(hasValidExternalApiToken('BEARER bot-token')).toBe(true)
  })

  it('rejects invalid or missing authorization headers', () => {
    process.env.KAKAO_BOT_TOKEN = 'bot-token'

    expect(hasValidExternalApiToken(null)).toBe(false)
    expect(hasValidExternalApiToken('bot-token')).toBe(false)
    expect(hasValidExternalApiToken('Bearer wrong-token')).toBe(false)
  })
})
