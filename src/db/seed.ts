import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { useSettingsStore } from '../stores/settingsStore';
import { DEFAULT_CATEGORIES } from '../utils/categories';

export async function seedIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  if (useSettingsStore.getState().hasSeededCategories) return;

  await db.withTransactionAsync(async () => {
    for (const cat of DEFAULT_CATEGORIES) {
      const id = Crypto.randomUUID();
      const now = Date.now();
      await db.runAsync(
        `INSERT OR IGNORE INTO categories
          (id, name, flow_type, khumus_eligible, is_loan_type, color, icon, is_system, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, cat.name, cat.flow_type,
          cat.khumus_eligible ? 1 : 0,
          cat.is_loan_type ? 1 : 0,
          cat.color, cat.icon,
          cat.is_system ? 1 : 0,
          cat.sort_order, now, now,
        ]
      );
    }
  });

  useSettingsStore.getState().setHasSeededCategories(true);
}
