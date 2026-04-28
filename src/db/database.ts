import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema.sql';
import { seedIfNeeded } from './seed';

export async function onInit(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(CREATE_TABLES_SQL);
  await seedIfNeeded(db);
}
