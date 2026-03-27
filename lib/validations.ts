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
  password: z.string().min(8, '비밀번호는 8자 이상'),
  name: z.string().min(1).max(50),
})
