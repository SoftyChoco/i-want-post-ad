import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { generateContentMock, getGenerativeModelMock, getPolicyContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
  getGenerativeModelMock: vi.fn(),
  getPolicyContentMock: vi.fn(),
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function createGoogleGenerativeAI() {
    return {
      getGenerativeModel: getGenerativeModelMock,
    }
  }),
}))

vi.mock('@/lib/policy', () => ({
  getPolicyContent: getPolicyContentMock,
}))

import { judgeAdContent } from '@/lib/llm'

describe('judgeAdContent', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key'
    delete process.env.GEMINI_MODEL

    generateContentMock.mockReset()
    getGenerativeModelMock.mockReset()
    getPolicyContentMock.mockReset()

    generateContentMock.mockResolvedValue({
      response: { text: () => '{"verdict":"compliant","reason":"ok","ruleIds":[]}' },
    })
    getGenerativeModelMock.mockReturnValue({ generateContent: generateContentMock })
    getPolicyContentMock.mockResolvedValue('POLICY-SPEC')
  })

  afterEach(() => {
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_MODEL
  })

  it('uses the current stable Flash model when no model is configured', async () => {
    await judgeAdContent({ contentType: '기타', contentBody: '무료 학습 자료 공유' })

    expect(getGenerativeModelMock).toHaveBeenCalledWith({ model: 'gemini-3.5-flash' })
  })

  it('falls back to the current stable Flash model when the retired model is configured', async () => {
    process.env.GEMINI_MODEL = 'gemini-3.1-flash-lite-preview'

    await judgeAdContent({ contentType: '기타', contentBody: '무료 학습 자료 공유' })

    expect(getGenerativeModelMock).toHaveBeenCalledWith({ model: 'gemini-3.5-flash' })
  })

  it('uses a configured non-retired model name', async () => {
    process.env.GEMINI_MODEL = 'gemini-2.5-flash'

    await judgeAdContent({ contentType: '기타', contentBody: '무료 학습 자료 공유' })

    expect(getGenerativeModelMock).toHaveBeenCalledWith({ model: 'gemini-2.5-flash' })
  })
})
