import 'reflect-metadata';
import path from 'path';
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { AdRequest } from './entities/AdRequest';
import { AuditLog } from './entities/AuditLog';
import { PolicyDocument } from './entities/PolicyDocument';
import { PolicyRevision } from './entities/PolicyRevision';
import { mkdirSync } from 'fs';

mkdirSync(path.resolve(process.cwd(), 'data'), { recursive: true });

declare global { var __db__: DataSource | undefined }

const AppDataSource = globalThis.__db__ || new DataSource({
  type: 'better-sqlite3',
  database: process.env.DATABASE_URL || path.resolve(process.cwd(), 'data', 'db.sqlite'),
  entities: [User, AdRequest, AuditLog, PolicyDocument, PolicyRevision],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  prepareDatabase: (db) => {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    db.pragma('synchronous = NORMAL');
    db.pragma('wal_autocheckpoint = 1000');
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db__ = AppDataSource;
}

export async function getDb(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}

export async function getUserRepo() {
  const db = await getDb();
  return db.getRepository('User');
}

export async function getAdRequestRepo() {
  const db = await getDb();
  return db.getRepository('AdRequest');
}

export async function getAuditLogRepo() {
  const db = await getDb();
  return db.getRepository('AuditLog');
}

export async function getPolicyDocumentRepo() {
  const db = await getDb();
  return db.getRepository('PolicyDocument');
}

export async function getPolicyRevisionRepo() {
  const db = await getDb();
  return db.getRepository('PolicyRevision');
}

export { AppDataSource };
