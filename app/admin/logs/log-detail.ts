type RawDetail = {
  name?: string
  reason?: string
  requestCode?: string
  stage?: string
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

function sanitizeSensitiveText(text: string): string {
  return text.replace(EMAIL_PATTERN, '[이메일 비공개]')
}

function stageLabel(stage?: string): string {
  if (stage === 'requested') return '요청'
  if (stage === 'completed') return '완료'
  if (stage === 'failed') return '실패'
  return '진행'
}

export function formatAuditDetail(action: string, details: string | null): string {
  if (!details) return ''

  let parsed: RawDetail
  try {
    parsed = JSON.parse(details)
  } catch {
    return sanitizeSensitiveText(details)
  }

  if (action === 'create_mod' || action === 'delete_mod' || action === 'reset_mod_password') {
    if (parsed.name) return `닉네임: ${sanitizeSensitiveText(parsed.name)}`
    return ''
  }

  if (action === 'rejudge') {
    const code = parsed.requestCode ? sanitizeSensitiveText(parsed.requestCode) : ''
    const stage = stageLabel(parsed.stage)
    if (code) return `요청코드: ${code} (${stage})`
    return `재판정 ${stage}`
  }

  if (action === 'change_password') {
    return ''
  }

  if (parsed.reason) return sanitizeSensitiveText(parsed.reason)
  if (parsed.name) return `닉네임: ${sanitizeSensitiveText(parsed.name)}`
  if (parsed.requestCode) return `요청코드: ${sanitizeSensitiveText(parsed.requestCode)}`
  return ''
}
