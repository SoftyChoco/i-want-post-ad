import { existsSync, mkdirSync } from 'fs'
import path from 'path'

function findProjectRootFrom(start: string): string | null {
  let current = path.resolve(start)

  while (true) {
    if (existsSync(path.join(current, 'package.json'))) {
      return current
    }

    const parent = path.dirname(current)
    if (parent === current) {
      return null
    }

    current = parent
  }
}

export function resolveProjectRoot(): string {
  const candidates = [process.cwd(), typeof __dirname === 'string' ? __dirname : process.cwd()]

  for (const candidate of candidates) {
    const root = findProjectRootFrom(candidate)
    if (root) {
      return root
    }
  }

  return process.cwd()
}

export function resolveSqliteDatabasePath(databaseUrl: string | undefined, projectRoot: string): string {
  const configured = (databaseUrl || '').trim()

  if (!configured) {
    return path.resolve(projectRoot, 'data', 'db.sqlite')
  }

  if (configured === ':memory:' || configured.startsWith('file:') || path.isAbsolute(configured)) {
    return configured
  }

  return path.resolve(projectRoot, configured)
}

export function ensureSqliteDatabaseDir(databasePath: string): void {
  if (!databasePath || databasePath === ':memory:' || databasePath.startsWith('file:')) {
    return
  }

  mkdirSync(path.dirname(databasePath), { recursive: true })
}
