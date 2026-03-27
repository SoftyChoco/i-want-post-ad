import { getDb, getPolicyDocumentRepo } from './db'

export const DEFAULT_POLICY_VERSION = '1.0.0'
const DEFAULT_POLICY_KEY = 'default'
export const DEFAULT_POLICY_CONTENT = `# 개발자 취업/이직/성장 정보 공유방 운영 정책
# 버전: 1.0.0
# 최종 수정: 2026-03-22

==================================================
커뮤니티 안내 (필독)
==================================================

우리 방, 이렇게 함께 만들어요!

안녕하세요!
개발자 취업/이직을 함께 준비하는 공간에 오신 것을 환영합니다.
이곳은 모두가 함께 만들어가는 커뮤니티입니다.

우리 방의 약속
1. '정답'보다 '과정'을 공유해요.
   정답을 찾기보다, 왜 그런지 질문하며 함께 고민하는 과정을 더 중요하게 생각합니다.
2. 서로에게 좋은 동료가 되어줘요.
   비난이나 훈수 대신, 건설적인 피드백과 따뜻한 격려를 나눕니다.
3. 먼저 주는 사람이 더 많이 얻어가요.
   다른 사람의 질문에 답하고 경험을 공유하다 보면 함께 성장할 수 있습니다.

시작은 이렇게
- 닉네임은 비슷하지 않게 고유하게 작성해주세요.
- 간단한 자기소개(분야, 목표, 관심사 등)를 남겨주시면 서로를 더 쉽게 도울 수 있습니다.

==================================================
운영 목표
==================================================

본 llms.txt의 목적은, 개발자 취업/이직/성장 정보 공유방의 취지에 맞게
오픈채팅방 사용자에게 실제로 도움이 되는 콘텐츠를 구분하는 데 있습니다.

핵심 지향점
- 개인이 공부/학습을 위해 공유하는 내용
- 피드백을 얻기 위해 올리는 프로젝트/포트폴리오
- 채팅방 인원에게 실질적으로 도움이 되는 정보 공유

멤버에게 도움되는 콘텐츠 판단 기준
- 학습/취업/이직/성장에 바로 활용 가능한 정보가 있는가
- 대상(누구에게 필요한지)과 맥락(왜 지금 필요한지)이 명확한가
- 단순 노출 목적이 아닌, 질문/피드백/경험 공유 의도가 있는가

==================================================
채팅방 내 홍보/광고 가이드
==================================================

- 채팅방 인원의 취업/이직/성장을 위한 무료 콘텐츠나,
  개인 사이드 프로젝트 공유는 허용합니다.
  (단, 글을 통한 노골적인 유료 결제 유도는 금지)

- 특정 상황에서만 무료인 마케팅성 홍보는 금지합니다.
  - 불가: 국비지원, 내일배움카드 등 수익 전환 목적 마케팅
  - 가능: 연령 제한, 연차 제한 등 타겟 조건 명시

- 채팅방 인원에게 도움이 되는 채용공고/외주 구인은 허용합니다.
  - 채용 플랫폼 링크가 아닌 경우 운영진 문의 권장
  - 신뢰 가능한 플랫폼 예: 잡코리아, 사람인, 원티드 등

- 일주일 이내 동일 광고 재게시 시 스팸으로 간주합니다.

- 위 기준을 지키더라도, 채팅방 구성원 다수가 불편함을 느끼는 경우
  운영진 판단으로 제한될 수 있습니다.

==================================================
LLM 자동 판정 핵심 주의사항
==================================================

- 노골적인 유료 결제 유도, 부트캠프/강의 마케팅성 광고는 거절합니다.
- 직접 결제 유도뿐 아니라 DM 유도/상담 유도 후 유료 전환형 문구도 거절합니다.
- 신뢰성이 떨어지는 채용공고, 타겟이 불명확한 채용공고는 거절합니다.
- 애매한 경우에는 거절보다 needs_review(운영진 검토)로 분류합니다.

==================================================
POLICY-SPEC
==================================================

RULE-001: mission_alignment
  goal: developer_career_growth_community
  allow_if: [study_share, learning_resource, feedback_request, side_project_share, career_helpful_info]
  action: allow

RULE-002: community_conduct
  required: [respectful_tone, constructive_feedback, growth_oriented_context]
  action: conditional

RULE-003: promotion_timing_and_spam
  duplicate_ad_within_days: 7
  on_violation: needs_review
  enforcement: moderator_judgment
  note: 반복 광고 여부는 부방장/방장이 운영 맥락을 보고 최종 판단

RULE-004: paid_promotion_restriction
  reject_if_contains: [explicit_paid_conversion, bootcamp_marketing, affiliate_style_payment_inducement]
  reject_examples: ["결제하면", "유료 전환", "부트캠프 모집", "국비지원 마케팅", "내일배움카드 마케팅"]
  action: reject

RULE-005: hiring_quality_gate
  allow_target: [developer_hiring, outsourcing_hiring]
  required_fields: [company_or_team, role_title, work_type, target_profile, contact_or_apply_path]
  reject_if: [unreliable_recruitment, unclear_target_role, unverifiable_company_or_contact, missing_required_fields]
  trusted_platform_examples: [jobkorea, saramin, wanted]
  action: reject

RULE-006: content_format
  max_length: 2000
  allow_urls_in_body: true
  require_request_code_in_body: false
  note: 요청코드 상단 기입은 운영 가이드 기준으로 관리하고, 시스템 하드검증은 현재 적용하지 않음
  action: conditional

RULE-007: boundary_case
  when_ambiguous: true
  fallback_action: needs_review
  note: 정책 위반 근거가 명확하지 않으면 운영진 검토로 이관 (자동 기본 거절 규칙 없음)

RULE-008: output_contract
  must_return: [verdict, reason, ruleIds]
  verdict_set: [compliant, non_compliant, needs_review]
  reason_language: ko

RULE-009: rule_precedence
  priority_order: [RULE-004, RULE-005, RULE-003, RULE-001, RULE-002, RULE-007]
  conflict_resolution: hard_reject_rules_override_all
  action: conditional
`

function normalizePolicyContent(content: string): string {
  return content.replace(/\r\n/g, '\n')
}

function parseVersion(version: string): [number, number, number] {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return [1, 0, 0]
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function bumpPatchVersion(version: string): string {
  const [major, minor, patch] = parseVersion(version)
  return `${major}.${minor}.${patch + 1}`
}

export function applyVersionToContent(content: string, version: string): string {
  const normalized = normalizePolicyContent(content)
  if (/^#\s*버전:\s*.+$/m.test(normalized)) {
    return normalized.replace(/^#\s*버전:\s*.+$/m, `# 버전: ${version}`)
  }

  const lines = normalized.split('\n')
  if (lines.length === 0) return `# 버전: ${version}`
  if (lines[0].startsWith('#')) {
    return `${lines[0]}\n# 버전: ${version}\n${lines.slice(1).join('\n')}`
  }
  return `# 버전: ${version}\n${normalized}`
}

async function ensureDefaultPolicy(): Promise<{ content: string; version: string }> {
  const repo = await getPolicyDocumentRepo()
  const existing = await repo.findOne({ where: { key: DEFAULT_POLICY_KEY } })
  if (existing?.content?.trim()) {
    return { content: existing.content, version: existing.version || DEFAULT_POLICY_VERSION }
  }

  const seededContent = applyVersionToContent(DEFAULT_POLICY_CONTENT, DEFAULT_POLICY_VERSION)
  const created = repo.create({
    key: DEFAULT_POLICY_KEY,
    content: seededContent,
    version: DEFAULT_POLICY_VERSION,
  })
  await repo.save(created)
  return { content: seededContent, version: DEFAULT_POLICY_VERSION }
}

export async function getPolicyContent(): Promise<string> {
  const policy = await ensureDefaultPolicy()
  return policy.content
}

export async function setPolicyContent(content: string): Promise<string> {
  const db = await getDb()
  return db.transaction(async (manager) => {
    const policyRepo = manager.getRepository('PolicyDocument')
    const revisionRepo = manager.getRepository('PolicyRevision')

    let existing = await policyRepo.findOne({ where: { key: DEFAULT_POLICY_KEY } })
    if (!existing) {
      const seeded = applyVersionToContent(DEFAULT_POLICY_CONTENT, DEFAULT_POLICY_VERSION)
      existing = policyRepo.create({
        key: DEFAULT_POLICY_KEY,
        content: seeded,
        version: DEFAULT_POLICY_VERSION,
      })
      existing = await policyRepo.save(existing)
    }

    const nextVersion = bumpPatchVersion(existing.version || DEFAULT_POLICY_VERSION)
    const nextContent = applyVersionToContent(content, nextVersion)

    if (normalizePolicyContent(existing.content) === normalizePolicyContent(nextContent)) {
      return existing.version || DEFAULT_POLICY_VERSION
    }

    const previousRevision = revisionRepo.create({
      policyKey: DEFAULT_POLICY_KEY,
      version: existing.version || DEFAULT_POLICY_VERSION,
      content: existing.content,
    })
    await revisionRepo.save(previousRevision)

    existing.content = nextContent
    existing.version = nextVersion
    await policyRepo.save(existing)
    return nextVersion
  })
}

export async function getPolicyVersion(): Promise<string> {
  const policy = await ensureDefaultPolicy()
  return policy.version
}
