import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema.sql';
import { seedIfNeeded } from './seed';
import { useBudgetStore } from '../stores/budgetStore';

const initPromises = new WeakMap<SQLite.SQLiteDatabase, Promise<void>>();

export async function onInit(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = initPromises.get(db);
  if (existing) return existing;
  const promise = (async () => {
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync(CREATE_TABLES_SQL);
    await seedIfNeeded(db);
    await useBudgetStore.getState().init(db);
  })().catch((err) => {
    initPromises.delete(db);
    throw err;
  });
  initPromises.set(db, promise);
  return promise;
}
