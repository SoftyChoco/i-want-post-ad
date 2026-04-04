import { getDb } from '@/lib/db'

export type AutoReplyGuardSettings = {
  windowMinutes: number
  warnCount: number
  blockCount: number
}

export type AutoReplyGuardUser = {
  id: number
  authorName: string
  isWhitelisted: boolean
  customWarnCount: number | null
  customBlockCount: number | null
  isBlocked: boolean
  blockedAt: string | null
  updatedAt: string
}

const DEFAULT_SETTINGS: AutoReplyGuardSettings = {
  windowMinutes: 3,
  warnCount: 3,
  blockCount: 5,
}

export const AUTO_REPLY_WARN_MESSAGE = '너무 잦은 호출 시 차단됩니다'
export const AUTO_REPLY_BLOCKED_MESSAGE = '차단되었습니다'

export async function ensureAutoReplyGuardTables() {
  const db = await getDb()
  if (typeof (db as { query?: unknown }).query !== 'function') return
  await db.query(
    `CREATE TABLE IF NOT EXISTS chat_auto_reply_guard_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      settings_key VARCHAR(50) UNIQUE NOT NULL,
      window_minutes INTEGER NOT NULL,
      warn_count INTEGER NOT NULL,
      block_count INTEGER NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )`
  )
  await db.query(
    `CREATE TABLE IF NOT EXISTS chat_auto_reply_guard_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_name VARCHAR(255) UNIQUE NOT NULL,
      is_whitelisted BOOLEAN NOT NULL DEFAULT 0,
      custom_warn_count INTEGER NULL,
      custom_block_count INTEGER NULL,
      is_blocked BOOLEAN NOT NULL DEFAULT 0,
      blocked_at DATETIME NULL,
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )`
  )
  await db.query(
    `CREATE TABLE IF NOT EXISTS chat_auto_reply_guard_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_name VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )`
  )
  await db.query(
    'CREATE INDEX IF NOT EXISTS idx_chat_auto_reply_guard_attempts_author_created ON chat_auto_reply_guard_attempts (author_name, created_at)'
  )

  await db.query(
    `INSERT OR IGNORE INTO chat_auto_reply_guard_settings (settings_key, window_minutes, warn_count, block_count)
     VALUES ('global', ?, ?, ?)`,
    [DEFAULT_SETTINGS.windowMinutes, DEFAULT_SETTINGS.warnCount, DEFAULT_SETTINGS.blockCount]
  )
}

export async function getAutoReplyGuardSettings(): Promise<AutoReplyGuardSettings> {
  await ensureAutoReplyGuardTables()
  const db = await getDb()
  if (typeof (db as { query?: unknown }).query !== 'function') return DEFAULT_SETTINGS
  const rows = await db.query(
    'SELECT window_minutes as windowMinutes, warn_count as warnCount, block_count as blockCount FROM chat_auto_reply_guard_settings WHERE settings_key = ?',
    ['global']
  ) as AutoReplyGuardSettings[]
  return rows[0] || DEFAULT_SETTINGS
}

export async function updateAutoReplyGuardSettings(next: AutoReplyGuardSettings) {
  await ensureAutoReplyGuardTables()
  const db = await getDb()
  if (typeof (db as { query?: unknown }).query !== 'function') return
  await db.query(
    `UPDATE chat_auto_reply_guard_settings
     SET window_minutes = ?, warn_count = ?, block_count = ?, updated_at = datetime('now')
     WHERE settings_key = ?`,
    [next.windowMinutes, next.warnCount, next.blockCount, 'global']
  )
}

export async function listAutoReplyGuardUsers(): Promise<AutoReplyGuardUser[]> {
  await ensureAutoReplyGuardTables()
  const db = await getDb()
  if (typeof (db as { query?: unknown }).query !== 'function') return []
  return await db.query(
    `SELECT id, author_name as authorName, is_whitelisted as isWhitelisted,
            custom_warn_count as customWarnCount, custom_block_count as customBlockCount,
            is_blocked as isBlocked, blocked_at as blockedAt, updated_at as updatedAt
     FROM chat_auto_reply_guard_users
     ORDER BY author_name ASC`
  ) as AutoReplyGuardUser[]
}

export async function upsertAutoReplyGuardUser(payload: {
  authorName: string
  isWhitelisted: boolean
  customWarnCount: number | null
  customBlockCount: number | null
}) {
  await ensureAutoReplyGuardTables()
  const db = await getDb()
  if (typeof (db as { query?: unknown }).query !== 'function') return
  await db.query(
    `INSERT INTO chat_auto_reply_guard_users (author_name, is_whitelisted, custom_warn_count, custom_block_count, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(author_name)
     DO UPDATE SET is_whitelisted = excluded.is_whitelisted,
                   custom_warn_count = excluded.custom_warn_count,
                   custom_block_count = excluded.custom_block_count,
                   updated_at = datetime('now')`,
    [payload.authorName, payload.isWhitelisted ? 1 : 0, payload.customWarnCount, payload.customBlockCount]
  )
}

export async function updateAutoReplyGuardUserById(
  id: number,
  patch: Partial<{
    isWhitelisted: boolean
    customWarnCount: number | null
    customBlockCount: number | null
    isBlocked: boolean
  }>
) {
  await ensureAutoReplyGuardTables()
  const db = await getDb()
  if (typeof (db as { query?: unknown }).query !== 'function') return false
  const currentRows = await db.query(
    `SELECT id, is_whitelisted as isWhitelisted, custom_warn_count as customWarnCount,
            custom_block_count as customBlockCount, is_blocked as isBlocked
     FROM chat_auto_reply_guard_users WHERE id = ?`,
    [id]
  ) as Array<{ id: number; isWhitelisted: number; customWarnCount: number | null; customBlockCount: number | null; isBlocked: number }>

  const current = currentRows[0]
  if (!current) return false

  const nextIsBlocked = patch.isBlocked ?? Boolean(current.isBlocked)
  await db.query(
    `UPDATE chat_auto_reply_guard_users
     SET is_whitelisted = ?,
         custom_warn_count = ?,
         custom_block_count = ?,
         is_blocked = ?,
         blocked_at = CASE
           WHEN ? = 1 AND is_blocked = 0 THEN datetime('now')
           WHEN ? = 0 THEN NULL
           ELSE blocked_at
         END,
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      (patch.isWhitelisted ?? Boolean(current.isWhitelisted)) ? 1 : 0,
      patch.customWarnCount === undefined ? current.customWarnCount : patch.customWarnCount,
      patch.customBlockCount === undefined ? current.customBlockCount : patch.customBlockCount,
      nextIsBlocked ? 1 : 0,
      nextIsBlocked ? 1 : 0,
      nextIsBlocked ? 1 : 0,
      id,
    ]
  )
  return true
}

export async function deleteAutoReplyGuardUserById(id: number) {
  await ensureAutoReplyGuardTables()
  const db = await getDb()
  if (typeof (db as { query?: unknown }).query !== 'function') return false
  const rows = await db.query('SELECT id FROM chat_auto_reply_guard_users WHERE id = ?', [id]) as Array<{ id: number }>
  if (!rows[0]) return false
  await db.query('DELETE FROM chat_auto_reply_guard_users WHERE id = ?', [id])
  return true
}

export async function evaluateAndRecordAutoReplyGuard(authorName: string): Promise<{
  blocked: boolean
  message: string | null
}> {
  await ensureAutoReplyGuardTables()
  const db = await getDb()
  if (typeof (db as { query?: unknown }).query !== 'function') {
    return { blocked: false, message: null }
  }
  const settings = await getAutoReplyGuardSettings()
  const users = await db.query(
    `SELECT id, is_whitelisted as isWhitelisted, custom_warn_count as customWarnCount,
            custom_block_count as customBlockCount, is_blocked as isBlocked
     FROM chat_auto_reply_guard_users
     WHERE author_name = ?`,
    [authorName]
  ) as Array<{ id: number; isWhitelisted: number; customWarnCount: number | null; customBlockCount: number | null; isBlocked: number }>
  const user = users[0] || null

  if (user?.isWhitelisted) {
    return { blocked: false, message: null }
  }
  if (user?.isBlocked) {
    return { blocked: true, message: null }
  }

  const warnCount = Math.max(1, user?.customWarnCount ?? settings.warnCount)
  const blockCount = Math.max(warnCount, user?.customBlockCount ?? settings.blockCount)
  const windowMinutes = Math.max(1, settings.windowMinutes)

  const countRows = await db.query(
    `SELECT COUNT(*) as total
     FROM chat_auto_reply_guard_attempts
     WHERE author_name = ?
       AND created_at >= datetime('now', ?)` ,
    [authorName, `-${windowMinutes} minutes`]
  ) as Array<{ total: number | string }>

  const beforeCount = Number(countRows[0]?.total || 0)
  const currentCount = beforeCount + 1

  await db.query(
    'INSERT INTO chat_auto_reply_guard_attempts (author_name, created_at) VALUES (?, datetime(\'now\'))',
    [authorName]
  )

  if (currentCount >= blockCount) {
    await db.query(
      `INSERT INTO chat_auto_reply_guard_users (author_name, is_whitelisted, custom_warn_count, custom_block_count, is_blocked, blocked_at, updated_at)
       VALUES (?, 0, NULL, NULL, 1, datetime('now'), datetime('now'))
       ON CONFLICT(author_name)
       DO UPDATE SET is_blocked = 1, blocked_at = COALESCE(chat_auto_reply_guard_users.blocked_at, datetime('now')), updated_at = datetime('now')`,
      [authorName]
    )
    return { blocked: true, message: AUTO_REPLY_BLOCKED_MESSAGE }
  }

  if (currentCount === warnCount) {
    return { blocked: false, message: AUTO_REPLY_WARN_MESSAGE }
  }

  return { blocked: false, message: null }
}
