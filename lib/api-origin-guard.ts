type OriginInput = {
  expectedOrigin: string
  expectedHost: string | null
  origin: string | null
  referer: string | null
}

function matchesExpectedOrigin(input: string, expectedOrigin: string, expectedHost: string | null): boolean {
  try {
    const parsed = new URL(input)
    if (parsed.origin === expectedOrigin) return true
    if (expectedHost && parsed.host === expectedHost) return true
    return false
  } catch {
    return false
  }
}

export function isSameOriginUiRequestFromHeaders(input: OriginInput): boolean {
  if (input.origin) {
    return matchesExpectedOrigin(input.origin, input.expectedOrigin, input.expectedHost)
  }

  if (input.referer) {
    return matchesExpectedOrigin(input.referer, input.expectedOrigin, input.expectedHost)
  }

  return false
}
