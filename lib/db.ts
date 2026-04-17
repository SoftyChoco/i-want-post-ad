import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { AdRequest } from './entities/AdRequest';
import { AuditLog } from './entities/AuditLog';
import { PolicyDocument } from './entities/PolicyDocument';
import { PolicyRevision } from './entities/PolicyRevision';
import { ChatMessageSchedule } from './entities/ChatMessageSchedule';
import { ChatMessageSettings } from './entities/ChatMessageSettings';
import { ChatMessageDirect } from './entities/ChatMessageDirect';
import { ChatEventBatch } from './entities/ChatEventBatch';
import { ChatEvent } from './entities/ChatEvent';
import { ChatMessageTriggerRule } from './entities/ChatMessageTriggerRule';
import { ensureSqliteDatabaseDir, resolveProjectRoot, resolveSqliteDatabasePath } from './database-path';

const projectRoot = resolveProjectRoot();
const databasePath = resolveSqliteDatabasePath(process.env.DATABASE_URL, projectRoot);

ensureSqliteDatabaseDir(databasePath);

declare global { var __db__: DataSource | undefined }

const AppDataSource = globalThis.__db__ || new DataSource({
  type: 'better-sqlite3',
  database: databasePath,
  entities: [
    User,
    AdRequest,
    AuditLog,
    PolicyDocument,
    PolicyRevision,
    ChatMessageSchedule,
    ChatMessageSettings,
    ChatMessageDirect,
    ChatEventBatch,
    ChatEvent,
    ChatMessageTriggerRule,
  ],
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
  return db.getRepository(User);
}

export async function getAdRequestRepo() {
  const db = await getDb();
  return db.getRepository(AdRequest);
}

export async function getAuditLogRepo() {
  const db = await getDb();
  return db.getRepository(AuditLog);
}

export async function getPolicyDocumentRepo() {
  const db = await getDb();
  return db.getRepository(PolicyDocument);
}

export async function getPolicyRevisionRepo() {
  const db = await getDb();
  return db.getRepository(PolicyRevision);
}

export async function getChatMessageScheduleRepo() {
  const db = await getDb();
  return db.getRepository(ChatMessageSchedule);
}

export async function getChatMessageSettingsRepo() {
  const db = await getDb();
  return db.getRepository(ChatMessageSettings);
}

export async function getChatMessageDirectRepo() {
  const db = await getDb();
  return db.getRepository(ChatMessageDirect);
}

export async function getChatEventBatchRepo() {
  const db = await getDb();
  return db.getRepository(ChatEventBatch);
}

export async function getChatEventRepo() {
  const db = await getDb();
  return db.getRepository(ChatEvent);
}

export async function getChatMessageTriggerRuleRepo() {
  const db = await getDb();
  return db.getRepository(ChatMessageTriggerRule);
}

export { AppDataSource };
