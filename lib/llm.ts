import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPolicyContent } from './policy'

export interface LLMJudgment {
  verdict: 'compliant' | 'non_compliant' | 'needs_review' | 'error'
  reason: string
  ruleIds: string[]
  suggestion?: string
}

function normalizeContentType(contentType: string): string {
  const map: Record<string, string> = {
    '교육/강의': 'education',
    '개발 도구/서비스': 'dev-tool',
    '채용 공고': 'recruitment',
    '기술 서적': 'book',
    '기타': 'other',
  }

  return map[contentType] || contentType
}

export async function judgeAdContent(input: {
  contentType: string
  contentBody: string
  contentUrl?: string
}): Promise<LLMJudgment> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite-preview'
    if (!apiKey || apiKey === 'your-gemini-api-key') {
      return { verdict: 'error', reason: 'GEMINI_API_KEY가 설정되지 않았습니다', ruleIds: [] }
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: modelName })

    const policyContent = await getPolicyContent()

const systemPrompt = `당신은 카카오톡 오픈채팅방 광고 메시지 정책 심사관입니다.
아래 정책 명세(POLICY-SPEC)를 기준으로 광고 콘텐츠를 심사하세요.
제출된 '본문'은 오픈채팅방에 실제로 게시될 전체 메시지 내용입니다.

${policyContent}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
{"verdict": "compliant 또는 non_compliant 또는 needs_review", "reason": "판정 사유(한국어)", "ruleIds": ["RULE-XXX"], "suggestion": "수정 제안(해당 시, 없으면 null)"}`

    const normalizedContentType = normalizeContentType(input.contentType)

    const userPrompt = `오픈채팅방 광고 메시지 심사 요청:
- 광고 유형: ${input.contentType}
- 정책 분류 키: ${normalizedContentType}
- 메시지 본문: ${input.contentBody}
${input.contentUrl ? `- 관련 URL: ${input.contentUrl}` : ''}`

    const result = await Promise.race([
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LLM 응답 시간 초과 (60초)')), 60000)
      ),
    ])

    const text = result.response.text()

    try {
      // Try to extract JSON from response (might have markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return { verdict: 'needs_review', reason: 'LLM 응답 파싱 실패', ruleIds: [] }
      }
      const parsed = JSON.parse(jsonMatch[0])
      return {
        verdict: parsed.verdict || 'needs_review',
        reason: parsed.reason || 'LLM 사유 없음',
        ruleIds: Array.isArray(parsed.ruleIds) ? parsed.ruleIds : [],
        suggestion: parsed.suggestion || undefined,
      }
    } catch {
      return { verdict: 'needs_review', reason: 'LLM 응답 파싱 실패', ruleIds: [] }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'LLM 호출 실패'
    return { verdict: 'error', reason: message, ruleIds: [] }
  }
}
