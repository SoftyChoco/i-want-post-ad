'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ScheduleItem = {
  id: number
  scheduleName: string
  messageText: string
  mode: 'interval' | 'fixed_time'
  intervalMinutes: number | null
  fixedTime: string | null
  isActive: boolean
}

type Settings = {
  nightBlockEnabled: boolean
  nightStart: string | null
  nightEnd: string | null
}

type TabKey = 'direct' | 'schedule' | 'night'

export default function ScheduleManager({
  initialSchedules,
  initialSettings,
}: {
  initialSchedules: ScheduleItem[]
  initialSettings: Settings
}) {
  const router = useRouter()
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules)
  const [createLoading, setCreateLoading] = useState(false)
  const [directLoading, setDirectLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [savingScheduleId, setSavingScheduleId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('direct')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings>({
    nightBlockEnabled: initialSettings.nightBlockEnabled,
    nightStart: initialSettings.nightStart || '22:00',
    nightEnd: initialSettings.nightEnd || '07:00',
  })
  const [form, setForm] = useState({
    scheduleName: '',
    messageText: '',
    mode: 'interval' as ScheduleItem['mode'],
    intervalMinutes: 60,
    fixedTime: '09:00',
    isActive: true,
  })
  const [directMessageText, setDirectMessageText] = useState('')

  async function refreshSchedules() {
    const [schedulesRes, settingsRes] = await Promise.all([
      fetch('/api/admin/chat-messages', { credentials: 'include' }),
      fetch('/api/admin/chat-messages/settings', { credentials: 'include' }),
    ])
    const schedulesData = await schedulesRes.json()
    const settingsData = await settingsRes.json()
    if (schedulesRes.ok && settingsRes.ok) {
      setSchedules(schedulesData.data)
      setSettings({
        nightBlockEnabled: settingsData.data.nightBlockEnabled,
        nightStart: settingsData.data.nightStart || '22:00',
        nightEnd: settingsData.data.nightEnd || '07:00',
      })
      router.refresh()
      return
    }
    throw new Error(schedulesData.error?.message || settingsData.error?.message || '새로고침에 실패했습니다')
  }

  async function saveSettings() {
    setError(null)
    setNotice(null)
    setSettingsSaving(true)
    try {
      const res = await fetch('/api/admin/chat-messages/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nightBlockEnabled: settings.nightBlockEnabled,
          nightStart: settings.nightBlockEnabled ? settings.nightStart : null,
          nightEnd: settings.nightBlockEnabled ? settings.nightEnd : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || '설정 저장에 실패했습니다')
      await refreshSchedules()
      setNotice('공통 야간 차단 설정을 저장했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정 저장에 실패했습니다')
    } finally {
      setSettingsSaving(false)
    }
  }

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setCreateLoading(true)
    try {
      const payload = {
        scheduleName: form.scheduleName,
        messageText: form.messageText,
        mode: form.mode,
        intervalMinutes: form.mode === 'interval' ? form.intervalMinutes : null,
        fixedTime: form.mode === 'fixed_time' ? form.fixedTime : null,
        isActive: form.isActive,
      }
      const res = await fetch('/api/admin/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || '생성에 실패했습니다')
      await refreshSchedules()
      setForm((prev) => ({ ...prev, scheduleName: '', messageText: '' }))
      setNotice('스케줄을 생성했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성에 실패했습니다')
    } finally {
      setCreateLoading(false)
    }
  }

  async function createDirectMessage(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setDirectLoading(true)
    try {
      const res = await fetch('/api/admin/chat-messages/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageText: directMessageText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || '직접 메시지 작성에 실패했습니다')
      setDirectMessageText('')
      setNotice('직접 메시지를 등록했습니다. 봇이 다음 poll에서 읽어갑니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '직접 메시지 작성에 실패했습니다')
    } finally {
      setDirectLoading(false)
    }
  }

  async function updateSchedule(item: ScheduleItem, patch: Partial<ScheduleItem>) {
    setError(null)
    setNotice(null)
    setSavingScheduleId(item.id)
    const next = { ...item, ...patch }
    try {
      const res = await fetch(`/api/admin/chat-messages/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          scheduleName: next.scheduleName,
          messageText: next.messageText,
          mode: next.mode,
          intervalMinutes: next.mode === 'interval' ? next.intervalMinutes : null,
          fixedTime: next.mode === 'fixed_time' ? next.fixedTime : null,
          isActive: next.isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || '수정에 실패했습니다')
      await refreshSchedules()
      setNotice('스케줄을 저장했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다')
    } finally {
      setSavingScheduleId(null)
    }
  }

  async function deleteSchedule(item: ScheduleItem) {
    if (!window.confirm('해당 스케줄을 삭제하시겠습니까?')) return
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/admin/chat-messages/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || '삭제에 실패했습니다')
      await refreshSchedules()
      setNotice('스케줄을 삭제했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('direct')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'direct' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          직접 메시지 작성
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'schedule' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          스케줄 관리
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('night')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'night' ? 'border-gray-700 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          공통 야간 차단 설정
        </button>
      </div>

      {notice && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{notice}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeTab === 'night' && (
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">공통 야간 차단 설정</h2>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.nightBlockEnabled}
            onChange={(e) => setSettings((prev) => ({ ...prev, nightBlockEnabled: e.target.checked }))}
          />
          야간 시간에는 메시지 발송 중지
        </label>
        {settings.nightBlockEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">야간 시작</label>
              <input
                type="time"
                value={settings.nightStart || '22:00'}
                onChange={(e) => setSettings((prev) => ({ ...prev, nightStart: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">야간 종료</label>
              <input
                type="time"
                value={settings.nightEnd || '07:00'}
                onChange={(e) => setSettings((prev) => ({ ...prev, nightEnd: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveSettings}
            disabled={settingsSaving}
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm disabled:opacity-50"
          >
            {settingsSaving ? '저장중...' : '공통 설정 저장'}
          </button>
        </div>
      </section>
      )}

      {activeTab === 'schedule' && (
      <form onSubmit={createSchedule} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">스케줄 생성</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">스케줄 이름</label>
            <input
              type="text"
              value={form.scheduleName}
              onChange={(e) => setForm((prev) => ({ ...prev, scheduleName: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="예: 오전 공지, 점심 리마인드"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">실행 방식</label>
            <select
              value={form.mode}
              onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value as ScheduleItem['mode'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="interval">n분 반복</option>
              <option value="fixed_time">특정 시간</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">메시지 내용</label>
          <textarea
            value={form.messageText}
            onChange={(e) => setForm((prev) => ({ ...prev, messageText: e.target.value }))}
            rows={3}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        {form.mode === 'interval' ? (
          <div>
            <label className="block text-sm text-gray-700 mb-1">반복 간격 (분)</label>
            <input
              type="number"
              min={1}
              value={form.intervalMinutes}
              onChange={(e) => setForm((prev) => ({ ...prev, intervalMinutes: Number.parseInt(e.target.value || '0', 10) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm text-gray-700 mb-1">실행 시간</label>
            <input
              type="time"
              value={form.fixedTime}
              onChange={(e) => setForm((prev) => ({ ...prev, fixedTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          />
          활성화
        </label>
        <button
          type="submit"
          disabled={createLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50"
        >
          {createLoading ? '생성중...' : '스케줄 생성'}
        </button>
      </form>
      )}

      {activeTab === 'direct' && (
      <form onSubmit={createDirectMessage} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">직접 메시지 작성</h2>
        <p className="text-sm text-gray-600">저장하면 봇이 다음 poll 시점에 즉시 읽어갑니다.</p>
        <textarea
          value={directMessageText}
          onChange={(e) => setDirectMessageText(e.target.value)}
          rows={3}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="즉시 보낼 메시지를 입력하세요"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={directLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm disabled:opacity-50"
          >
            {directLoading ? '작성중...' : '직접 메시지 작성'}
          </button>
        </div>
      </form>
      )}

      {activeTab === 'schedule' && (
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <div className="text-sm text-gray-500 py-4">등록된 스케줄이 없습니다.</div>
        ) : schedules.map((item) => (
          <section key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={item.scheduleName}
                onChange={(e) =>
                  setSchedules((prev) => prev.map((s) => (s.id === item.id ? { ...s, scheduleName: e.target.value } : s)))
                }
                className="text-base font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1"
              />
              <button onClick={() => deleteSchedule(item)} className="text-xs text-red-600 hover:underline">삭제</button>
            </div>
            <textarea
              value={item.messageText}
              onChange={(e) => setSchedules((prev) => prev.map((s) => (s.id === item.id ? { ...s, messageText: e.target.value } : s)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={item.mode}
                onChange={(e) => setSchedules((prev) => prev.map((s) => (s.id === item.id ? { ...s, mode: e.target.value as ScheduleItem['mode'] } : s)))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="interval">n분 반복</option>
                <option value="fixed_time">특정 시간</option>
              </select>

              {item.mode === 'interval' ? (
                <input
                  type="number"
                  min={1}
                  value={item.intervalMinutes ?? 1}
                  onChange={(e) =>
                    setSchedules((prev) =>
                      prev.map((s) =>
                        s.id === item.id ? { ...s, intervalMinutes: Number.parseInt(e.target.value || '0', 10) } : s
                      )
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <input
                  type="time"
                  value={item.fixedTime || '09:00'}
                  onChange={(e) =>
                    setSchedules((prev) =>
                      prev.map((s) =>
                        s.id === item.id ? { ...s, fixedTime: e.target.value } : s
                      )
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              )}

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={item.isActive}
                  onChange={(e) =>
                    setSchedules((prev) =>
                      prev.map((s) => (s.id === item.id ? { ...s, isActive: e.target.checked } : s))
                    )
                  }
                />
                활성화
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => updateSchedule(item, {})}
                disabled={savingScheduleId === item.id}
                className="px-3 py-1.5 bg-gray-900 text-white rounded text-sm disabled:opacity-50"
              >
                {savingScheduleId === item.id ? '저장중...' : '저장'}
              </button>
            </div>
          </section>
        ))}
      </div>
      )}
    </div>
  )
}
