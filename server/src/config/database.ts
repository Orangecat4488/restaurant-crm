import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DB_PATH } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DatabaseWrapper {
  get<T = any>(sql: string, params?: any[]): Promise<T | null>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  run(sql: string, params?: any[]): Promise<{ changes: number; lastID: number }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

export type Database = DatabaseWrapper;

let dbInstance: DatabaseWrapper | null = null;
let rawDb: DatabaseSync | null = null;

export async function getDb(): Promise<DatabaseWrapper> {
  if (dbInstance) return dbInstance;

  const dbPath = path.isAbsolute(DB_PATH)
    ? DB_PATH
    : path.resolve(__dirname, '../../', DB_PATH);
  const dbDir = path.dirname(dbPath);

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  rawDb = new DatabaseSync(dbPath);

  // Enable foreign keys and WAL mode
  rawDb.exec('PRAGMA foreign_keys = ON;');
  rawDb.exec('PRAGMA journal_mode = WAL;');

  dbInstance = {
    async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
      if (!rawDb) throw new Error('Database not initialized');
      const stmt = rawDb.prepare(sql);
      const row = stmt.get(...params);
      return (row as T) || null;
    },
    async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      if (!rawDb) throw new Error('Database not initialized');
      const stmt = rawDb.prepare(sql);
      return stmt.all(...params) as T[];
    },
    async run(sql: string, params: any[] = []): Promise<{ changes: number; lastID: number }> {
      if (!rawDb) throw new Error('Database not initialized');
      const stmt = rawDb.prepare(sql);
      const result = stmt.run(...params);
      return {
        changes: Number(result.changes),
        lastID: Number(result.lastInsertRowid),
      };
    },
    async exec(sql: string): Promise<void> {
      if (!rawDb) throw new Error('Database not initialized');
      rawDb.exec(sql);
    },
    async close(): Promise<void> {
      if (rawDb) {
        rawDb.close();
        rawDb = null;
        dbInstance = null;
      }
    },
  };

  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
  }
}

export function getDbSync(): DatabaseWrapper | null {
  return dbInstance;
}