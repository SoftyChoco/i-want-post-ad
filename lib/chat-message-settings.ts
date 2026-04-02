import { getChatMessageSettingsRepo } from '@/lib/db'

export const CHAT_MESSAGE_SETTINGS_KEY = 'global'

export interface ChatMessageSettingsValue {
  nightBlockEnabled: boolean
  nightStart: string | null
  nightEnd: string | null
}

export const DEFAULT_CHAT_MESSAGE_SETTINGS: ChatMessageSettingsValue = {
  nightBlockEnabled: false,
  nightStart: '22:00',
  nightEnd: '07:00',
}

export async function getOrCreateChatMessageSettings(): Promise<ChatMessageSettingsValue> {
  const repo = await getChatMessageSettingsRepo()
  const existing = await repo.findOneBy({ key: CHAT_MESSAGE_SETTINGS_KEY })
  if (existing) {
    return {
      nightBlockEnabled: existing.nightBlockEnabled,
      nightStart: existing.nightStart,
      nightEnd: existing.nightEnd,
    }
  }

  const created = repo.create({
    key: CHAT_MESSAGE_SETTINGS_KEY,
    nightBlockEnabled: DEFAULT_CHAT_MESSAGE_SETTINGS.nightBlockEnabled,
    nightStart: DEFAULT_CHAT_MESSAGE_SETTINGS.nightStart,
    nightEnd: DEFAULT_CHAT_MESSAGE_SETTINGS.nightEnd,
  })
  const saved = await repo.save(created)
  return {
    nightBlockEnabled: saved.nightBlockEnabled,
    nightStart: saved.nightStart,
    nightEnd: saved.nightEnd,
  }
}

export async function setChatMessageSettings(input: ChatMessageSettingsValue): Promise<ChatMessageSettingsValue> {
  const repo = await getChatMessageSettingsRepo()
  const existing = await repo.findOneBy({ key: CHAT_MESSAGE_SETTINGS_KEY })
  if (!existing) {
    const created = repo.create({
      key: CHAT_MESSAGE_SETTINGS_KEY,
      nightBlockEnabled: input.nightBlockEnabled,
      nightStart: input.nightBlockEnabled ? input.nightStart : null,
      nightEnd: input.nightBlockEnabled ? input.nightEnd : null,
    })
    const saved = await repo.save(created)
    return {
      nightBlockEnabled: saved.nightBlockEnabled,
      nightStart: saved.nightStart,
      nightEnd: saved.nightEnd,
    }
  }

  existing.nightBlockEnabled = input.nightBlockEnabled
  existing.nightStart = input.nightBlockEnabled ? input.nightStart : null
  existing.nightEnd = input.nightBlockEnabled ? input.nightEnd : null
  const saved = await repo.save(existing)
  return {
    nightBlockEnabled: saved.nightBlockEnabled,
    nightStart: saved.nightStart,
    nightEnd: saved.nightEnd,
  }
}
