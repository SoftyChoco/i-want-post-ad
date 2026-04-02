import { z } from 'zod'

const normalizedOptionalUrlSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^www\./i.test(trimmed) || trimmed.includes('.')) return `https://${trimmed}`
  return trimmed
}, z.union([z.literal(''), z.string().url('올바른 URL을 입력해주세요')]))

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

export const adSubmitSchema = z.object({
  applicantName: z.string().min(1, '오픈채팅 닉네임을 입력해주세요').max(50),
  applicantContact: z.string().email('조회에 사용할 이메일 주소를 정확히 입력해주세요').max(100),
  contentType: z.string().min(1, '콘텐츠 유형을 선택해주세요').max(50),
  contentTitle: z.string().max(200).optional(),
  contentBody: z.string().min(10, '오픈채팅에 남길 본문은 10자 이상 입력해주세요').max(2000),
  contentUrl: normalizedOptionalUrlSchema.optional(),
  acknowledgedPolicy: z.boolean().refine((value) => value === true, {
    message: '필수 정책 안내를 확인하고 동의해 주세요',
  }),
})

export const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reason: z.string().min(1, '사유를 입력해주세요').max(500),
})

export const createModeratorSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(50),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: z.string().min(8, '새 비밀번호는 8자 이상').max(100),
}).refine((value) => value.currentPassword !== value.newPassword, {
  message: '새 비밀번호는 현재 비밀번호와 달라야 합니다',
  path: ['newPassword'],
})

const scheduleModeSchema = z.enum(['interval', 'fixed_time'])
const hhmmSchema = z.string().regex(/^\d{2}:\d{2}$/, '시간 형식은 HH:MM 이어야 합니다')

const chatMessageScheduleBaseSchema = z.object({
  scheduleName: z.string().min(1, '스케줄 이름을 입력해주세요').max(100),
  messageText: z.string().min(1, '메시지 내용을 입력해주세요').max(1000),
  mode: scheduleModeSchema,
  intervalMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  fixedTime: hhmmSchema.nullable().optional(),
  isActive: z.boolean(),
})

export const createChatMessageScheduleSchema = chatMessageScheduleBaseSchema.superRefine((value, ctx) => {
  if (value.mode === 'interval') {
    if (!value.intervalMinutes) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['intervalMinutes'], message: '반복 간격(분)을 입력해주세요' })
    }
  } else if (!value.fixedTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixedTime'], message: '실행 시간을 입력해주세요' })
  }

})

export const updateChatMessageScheduleSchema = chatMessageScheduleBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: '최소 한 개 이상의 수정 필드가 필요합니다' }
)

export const updateChatMessageSettingsSchema = z.object({
  nightBlockEnabled: z.boolean(),
  nightStart: hhmmSchema.nullable().optional(),
  nightEnd: hhmmSchema.nullable().optional(),
}).superRefine((value, ctx) => {
  if (!value.nightBlockEnabled) return
  if (!value.nightStart) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nightStart'], message: '야간 시작 시간을 입력해주세요' })
  }
  if (!value.nightEnd) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nightEnd'], message: '야간 종료 시간을 입력해주세요' })
  }
  if (value.nightStart && value.nightEnd && value.nightStart === value.nightEnd) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nightEnd'], message: '야간 시작/종료 시간은 달라야 합니다' })
  }
})

export const createDirectChatMessageSchema = z.object({
  messageText: z.string().min(1, '메시지 내용을 입력해주세요').max(1000),
})

const triggerRuleBaseSchema = z.object({
  ruleName: z.string().min(1, '룰 이름을 입력해주세요').max(100),
  keyword: z.string().min(1, '키워드를 입력해주세요').max(100),
  authorName: z.string().max(100).nullable().optional(),
  responseText: z.string().min(1, '응답 메시지를 입력해주세요').max(1000),
  isActive: z.boolean(),
})

export const createChatMessageTriggerRuleSchema = triggerRuleBaseSchema.transform((value) => ({
  ...value,
  keyword: value.keyword.trim(),
  authorName: value.authorName?.trim() ? value.authorName.trim() : null,
  ruleName: value.ruleName.trim(),
}))

export const updateChatMessageTriggerRuleSchema = triggerRuleBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: '최소 한 개 이상의 수정 필드가 필요합니다' }
)

const chatEventSchema = z.object({
  observedAt: z.string().datetime('observedAt 형식이 올바르지 않습니다'),
  authorName: z.string().min(1, 'authorName을 입력해주세요').max(100),
  content: z.string().min(1, 'content를 입력해주세요').max(2000),
})

export const createChatEventsBulkSchema = z.object({
  events: z.array(chatEventSchema).min(1, '최소 1건 이상의 이벤트가 필요합니다').max(20, '최대 20건까지 전송할 수 있습니다'),
})
