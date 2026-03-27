import { describe, expect, it } from 'vitest'
import { formatAuditDetail } from '@/app/admin/logs/log-detail'

describe('formatAuditDetail', () => {
  it('shows nickname for moderator create/delete actions', () => {
    expect(formatAuditDetail('create_mod', JSON.stringify({ name: '닉네임A', email: 'a@example.com' }))).toBe(
      '닉네임: 닉네임A'
    )
    expect(formatAuditDetail('delete_mod', JSON.stringify({ name: '닉네임B' }))).toBe('닉네임: 닉네임B')
  })

  it('formats rejudge action without exposing sensitive detail', () => {
    expect(
      formatAuditDetail('rejudge', JSON.stringify({ requestCode: 'REQ-20260327-ABCD', stage: 'completed' }))
    ).toBe('요청코드: REQ-20260327-ABCD (완료)')
  })

  it('masks emails if they appear in free-text reasons', () => {
    expect(formatAuditDetail('approve', JSON.stringify({ reason: '문의: user@example.com' }))).toBe(
      '문의: [이메일 비공개]'
    )
  })

  it('handles invalid JSON safely', () => {
    expect(formatAuditDetail('approve', 'plain text user@example.com')).toBe('plain text [이메일 비공개]')
  })
})
