import 'reflect-metadata';
import { loadEnvConfig } from '@next/env';
import { DataSource } from 'typeorm';
import { ensureSqliteDatabaseDir, resolveProjectRoot, resolveSqliteDatabasePath } from './lib/database-path';

const projectRoot = resolveProjectRoot();
loadEnvConfig(projectRoot);
const databasePath = resolveSqliteDatabasePath(process.env.DATABASE_URL, projectRoot);
ensureSqliteDatabaseDir(databasePath);

export default new DataSource({
  type: 'better-sqlite3',
  database: databasePath,
  entities: ['lib/entities/**/*.{ts,js}'],
  migrations: ['migrations/**/*.ts'],
  synchronize: false,
  logging: ['error'],
  prepareDatabase: (db) => {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    db.pragma('synchronous = NORMAL');
    db.pragma('wal_autocheckpoint = 1000');
  },
});
