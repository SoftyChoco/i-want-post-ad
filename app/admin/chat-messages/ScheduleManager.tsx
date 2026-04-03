'use client'

import { useState } from 'react'

type ScheduleItem = {
  id: number
  scheduleName: string
  messageText: string
  mode: 'interval' | 'fixed_time'
  intervalMinutes: number | null
  fixedTime: string | null
  isActive: boolean
  respectNightBlock: boolean
}

type Settings = {
  nightBlockEnabled: boolean
  nightStart: string | null
  nightEnd: string | null
}

type TriggerRuleItem = {
  id: number
  ruleName: string
  keyword: string
  authorName: string | null
  responseText: string
  isActive: boolean
  lastMatchedEventId: number | null
}

type TabKey = 'direct' | 'schedule' | 'trigger' | 'night'

export default function ScheduleManager({
  initialSchedules,
  initialSettings,
  initialTriggerRules,
}: {
  initialSchedules: ScheduleItem[]
  initialSettings: Settings
  initialTriggerRules: TriggerRuleItem[]
}) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules)
  const [createLoading, setCreateLoading] = useState(false)
  const [directLoading, setDirectLoading] = useState(false)
  const [createRuleLoading, setCreateRuleLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [savingScheduleId, setSavingScheduleId] = useState<number | null>(null)
  const [savingRuleId, setSavingRuleId] = useState<number | null>(null)
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
    respectNightBlock: true,
  })
  const [directMessageText, setDirectMessageText] = useState('')
  const [triggerRules, setTriggerRules] = useState<TriggerRuleItem[]>(initialTriggerRules)
  const [ruleForm, setRuleForm] = useState({
    ruleName: '',
    keyword: '',
    authorName: '',
    responseText: '',
    isActive: true,
  })

  async function refreshSchedules() {
    const [schedulesRes, settingsRes, rulesRes] = await Promise.all([
      fetch('/api/admin/chat-messages', { credentials: 'include' }),
      fetch('/api/admin/chat-messages/settings', { credentials: 'include' }),
      fetch('/api/admin/chat-messages/rules', { credentials: 'include' }),
    ])
    const schedulesData = await schedulesRes.json()
    const settingsData = await settingsRes.json()
    const rulesData = await rulesRes.json()
    const isRuleFeatureUnavailable = rulesRes.status === 503 && rulesData?.error?.code === 'FEATURE_UNAVAILABLE'
    if (schedulesRes.ok && settingsRes.ok && (rulesRes.ok || isRuleFeatureUnavailable)) {
      setSchedules(schedulesData.data)
      setTriggerRules(rulesRes.ok ? rulesData.data : [])
      setSettings({
        nightBlockEnabled: settingsData.data.nightBlockEnabled,
        nightStart: settingsData.data.nightStart || '22:00',
        nightEnd: settingsData.data.nightEnd || '07:00',
      })
      return
    }
    throw new Error(schedulesData.error?.message || settingsData.error?.message || rulesData?.error?.message || '새로고침에 실패했습니다')
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
        respectNightBlock: form.respectNightBlock,
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

  async function createTriggerRule(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setCreateRuleLoading(true)
    try {
      const res = await fetch('/api/admin/chat-messages/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ruleName: ruleForm.ruleName,
          keyword: ruleForm.keyword,
          authorName: ruleForm.authorName || null,
          responseText: ruleForm.responseText,
          isActive: ruleForm.isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || '자동응답 룰 생성에 실패했습니다')
      await refreshSchedules()
      setRuleForm({
        ruleName: '',
        keyword: '',
        authorName: '',
        responseText: '',
        isActive: true,
      })
      setNotice('자동응답 룰을 생성했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '자동응답 룰 생성에 실패했습니다')
    } finally {
      setCreateRuleLoading(false)
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
          respectNightBlock: next.respectNightBlock,
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

  async function updateTriggerRule(item: TriggerRuleItem) {
    setError(null)
    setNotice(null)
    setSavingRuleId(item.id)
    try {
      const res = await fetch(`/api/admin/chat-messages/rules/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ruleName: item.ruleName,
          keyword: item.keyword,
          authorName: item.authorName,
          responseText: item.responseText,
          isActive: item.isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || '자동응답 룰 수정에 실패했습니다')
      await refreshSchedules()
      setNotice('자동응답 룰을 저장했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '자동응답 룰 수정에 실패했습니다')
    } finally {
      setSavingRuleId(null)
    }
  }

  async function deleteTriggerRule(item: TriggerRuleItem) {
    if (!window.confirm('해당 자동응답 룰을 삭제하시겠습니까?')) return
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/admin/chat-messages/rules/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || '자동응답 룰 삭제에 실패했습니다')
      await refreshSchedules()
      setNotice('자동응답 룰을 삭제했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '자동응답 룰 삭제에 실패했습니다')
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
        <button
          type="button"
          onClick={() => setActiveTab('trigger')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'trigger' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          키워드 자동응답 룰
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
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.respectNightBlock}
            onChange={(e) => setForm((prev) => ({ ...prev, respectNightBlock: e.target.checked }))}
          />
          공통 야간 차단 적용
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
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={item.respectNightBlock}
                  onChange={(e) =>
                    setSchedules((prev) =>
                      prev.map((s) => (s.id === item.id ? { ...s, respectNightBlock: e.target.checked } : s))
                    )
                  }
                />
                야간 차단 적용
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

      {activeTab === 'trigger' && (
      <div className="space-y-4">
        <form onSubmit={createTriggerRule} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">자동응답 룰 생성</h2>
          <p className="text-sm text-gray-600">최신 수집 채팅에서 키워드 또는 작성자+키워드가 일치하면 응답 메시지를 발송합니다.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">룰 이름</label>
              <input
                type="text"
                value={ruleForm.ruleName}
                onChange={(e) => setRuleForm((prev) => ({ ...prev, ruleName: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="예: 문의 자동안내"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">키워드</label>
              <input
                type="text"
                value={ruleForm.keyword}
                onChange={(e) => setRuleForm((prev) => ({ ...prev, keyword: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="예: 신청방법"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">특정 작성자 (선택)</label>
            <input
              type="text"
              value={ruleForm.authorName}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, authorName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="비우면 전체 작성자 대상"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">응답 메시지</label>
            <textarea
              value={ruleForm.responseText}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, responseText: e.target.value }))}
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={ruleForm.isActive}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            활성화
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createRuleLoading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm disabled:opacity-50"
            >
              {createRuleLoading ? '생성중...' : '자동응답 룰 생성'}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {triggerRules.length === 0 ? (
            <div className="text-sm text-gray-500 py-4">등록된 자동응답 룰이 없습니다.</div>
          ) : triggerRules.map((rule) => (
            <section key={rule.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={rule.ruleName}
                  onChange={(e) =>
                    setTriggerRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, ruleName: e.target.value } : r)))
                  }
                  className="text-base font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1"
                />
                <button onClick={() => deleteTriggerRule(rule)} className="text-xs text-red-600 hover:underline">삭제</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">키워드</label>
                  <input
                    type="text"
                    value={rule.keyword}
                    onChange={(e) =>
                      setTriggerRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, keyword: e.target.value } : r)))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">특정 작성자 (선택)</label>
                  <input
                    type="text"
                    value={rule.authorName || ''}
                    onChange={(e) =>
                      setTriggerRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, authorName: e.target.value || null } : r)))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="비우면 전체"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">응답 메시지</label>
                <textarea
                  value={rule.responseText}
                  onChange={(e) =>
                    setTriggerRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, responseText: e.target.value } : r)))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={rule.isActive}
                    onChange={(e) =>
                      setTriggerRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: e.target.checked } : r)))
                    }
                  />
                  활성화
                </label>
                <span className="text-xs text-gray-500">
                  마지막 매칭 이벤트 ID: {rule.lastMatchedEventId ?? '-'}
                </span>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => updateTriggerRule(rule)}
                  disabled={savingRuleId === rule.id}
                  className="px-3 py-1.5 bg-gray-900 text-white rounded text-sm disabled:opacity-50"
                >
                  {savingRuleId === rule.id ? '저장중...' : '저장'}
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
      )}
    </div>
  )
}
