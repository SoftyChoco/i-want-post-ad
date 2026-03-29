import { describe, expect, it } from 'vitest'
import { decodeActorNameHeaderValue, encodeActorNameHeaderValue, getActorFromHeaders } from '@/lib/request-actor'

describe('request actor header helpers', () => {
  it('encodes and decodes non-ascii actor names safely', () => {
    const name = '소프티초코'
    const encoded = encodeActorNameHeaderValue(name)

    expect(encoded).not.toContain('%')
    expect(decodeActorNameHeaderValue(encoded)).toBe(name)
  })

  it('keeps backward compatibility with percent-encoded values', () => {
    const legacy = encodeURIComponent('부방장')

    expect(decodeActorNameHeaderValue(legacy)).toBe('부방장')
  })

  it('parses actor fields from headers consistently', () => {
    const headers = new Headers()
    headers.set('x-user-id', '12')
    headers.set('x-user-role', 'moderator')
    headers.set('x-user-name', encodeActorNameHeaderValue('개발감자'))

    expect(getActorFromHeaders(headers)).toEqual({
      userId: 12,
      role: 'moderator',
      name: '개발감자',
    })
  })
})
