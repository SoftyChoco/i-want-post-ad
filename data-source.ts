import 'reflect-metadata';
import path from 'path';
import { loadEnvConfig } from '@next/env';
import { DataSource } from 'typeorm';

loadEnvConfig(process.cwd());

export default new DataSource({
  type: 'better-sqlite3',
  database: process.env.DATABASE_URL || path.resolve(process.cwd(), 'data', 'db.sqlite'),
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
