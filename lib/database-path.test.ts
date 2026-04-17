import path from 'path'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { describe, expect, it } from 'vitest'
import { ensureSqliteDatabaseDir, resolveSqliteDatabasePath } from './database-path'

describe('database path utilities', () => {
  it('resolves default sqlite path under project root', () => {
    const resolved = resolveSqliteDatabasePath(undefined, '/srv/app')
    expect(resolved).toBe(path.resolve('/srv/app', 'data', 'db.sqlite'))
  })

  it('resolves relative DATABASE_URL against project root', () => {
    const resolved = resolveSqliteDatabasePath('./storage/main.sqlite', '/srv/app')
    expect(resolved).toBe(path.resolve('/srv/app', './storage/main.sqlite'))
  })

  it('keeps absolute and special sqlite URLs as-is', () => {
    expect(resolveSqliteDatabasePath('/var/lib/app/data.sqlite', '/srv/app')).toBe('/var/lib/app/data.sqlite')
    expect(resolveSqliteDatabasePath(':memory:', '/srv/app')).toBe(':memory:')
    expect(resolveSqliteDatabasePath('file:./data/db.sqlite', '/srv/app')).toBe('file:./data/db.sqlite')
  })

  it('creates parent directory for sqlite file paths', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'db-path-test-'))

    try {
      const dbPath = path.join(root, 'nested', 'db.sqlite')
      ensureSqliteDatabaseDir(dbPath)
      expect(existsSync(path.dirname(dbPath))).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
