import { describe, expect, it } from 'vitest'
import { getRejudgeButtonLabel, shouldClearRejudgeNotice } from '@/app/admin/requests/[id]/rejudge-ui-state'

describe('rejudge ui state', () => {
  it('clears notice only when processing has ended', () => {
    expect(shouldClearRejudgeNotice(true)).toBe(false)
    expect(shouldClearRejudgeNotice(false)).toBe(true)
  })

  it('returns consistent button labels by loading/processing state', () => {
    expect(getRejudgeButtonLabel(true, false)).toBe('재판정 요청중...')
    expect(getRejudgeButtonLabel(false, true)).toBe('재판정 진행중...')
    expect(getRejudgeButtonLabel(false, false)).toBe('재판정')
  })
})
