import { describe, expect, it } from 'vitest'
import { applyVersionToContent, bumpPatchVersion } from '@/lib/policy'

describe('policy version helpers', () => {
  it('bumps patch version while keeping major/minor', () => {
    expect(bumpPatchVersion('1.0.0')).toBe('1.0.1')
    expect(bumpPatchVersion('2.5.9')).toBe('2.5.10')
  })

  it('falls back safely on invalid version strings', () => {
    expect(bumpPatchVersion('invalid')).toBe('1.0.1')
  })

  it('replaces existing version line in policy content', () => {
    const input = '# 제목\n# 버전: 1.0.0\n본문'
    const updated = applyVersionToContent(input, '1.0.1')
    expect(updated).toContain('# 버전: 1.0.1')
    expect(updated).not.toContain('# 버전: 1.0.0')
  })

  it('inserts version line when absent', () => {
    const input = '# 제목\n본문'
    const updated = applyVersionToContent(input, '1.0.1')
    expect(updated).toBe('# 제목\n# 버전: 1.0.1\n본문')
  })
})
