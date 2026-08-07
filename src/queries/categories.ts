import * as Crypto from 'expo-crypto';
import { SQLiteDatabase } from 'expo-sqlite';
import { RawCategory } from '../db/types';
import { FlowType } from '../types';
import { deleteBudgetsByCategory } from './budgets';

export interface CreateCategoryInput {
  name: string;
  flow_type: FlowType;
  khumus_eligible: boolean;
  color: string;
  icon: string;
}

export async function createCategory(
  db: SQLiteDatabase,
  input: CreateCategoryInput
): Promise<void> {
  const id = Crypto.randomUUID();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO categories
      (id, name, flow_type, khumus_eligible, is_loan_type, color, icon, is_system, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, 0, ?, ?, ?)`,
    [id, input.name, input.flow_type, input.khumus_eligible ? 1 : 0,
     input.color, input.icon, now, now, now]
  );
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<CreateCategoryInput>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.name !== undefined)            { fields.push('name = ?');            values.push(patch.name); }
  if (patch.flow_type !== undefined)       { fields.push('flow_type = ?');       values.push(patch.flow_type); }
  if (patch.khumus_eligible !== undefined) { fields.push('khumus_eligible = ?'); values.push(patch.khumus_eligible ? 1 : 0); }
  if (patch.color !== undefined)           { fields.push('color = ?');           values.push(patch.color); }
  if (patch.icon !== undefined)            { fields.push('icon = ?');            values.push(patch.icon); }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(Date.now(), id);
  await db.runAsync(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
}

const UNCATEGORIZED_NAME = 'Uncategorized';

async function getOrCreateUncategorized(db: SQLiteDatabase): Promise<string> {
  const existing = await getCategoryByName(db, UNCATEGORIZED_NAME);
  if (existing) return existing.id;
  const id = Crypto.randomUUID();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO categories
      (id, name, flow_type, khumus_eligible, is_loan_type, color, icon, is_system, sort_order, created_at, updated_at)
     VALUES (?, ?, 'BOTH', 0, 0, ?, ?, 1, ?, ?, ?)`,
    [id, UNCATEGORIZED_NAME, '#94A3B8', 'help-circle-outline', 9999, now, now]
  );
  return id;
}

export async function deleteCategory(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    const inUse = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM transactions WHERE category_id = ?`,
      [id]
    );
    if (inUse && inUse.cnt > 0) {
      const uncategorizedId = await getOrCreateUncategorized(db);
      if (uncategorizedId !== id) {
        await db.runAsync(
          `UPDATE transactions SET category_id = ?, updated_at = ? WHERE category_id = ?`,
          [uncategorizedId, Date.now(), id]
        );
      }
    }
    await deleteBudgetsByCategory(db, id);
    await db.runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
  });
}

export async function reorderCategories(
  db: SQLiteDatabase,
  orderedIds: string[],
  offset: number = 0
): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        `UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?`,
        [offset + i, now, orderedIds[i]]
      );
    }
  });
}

export async function getAllCategories(db: SQLiteDatabase): Promise<RawCategory[]> {
  return db.getAllAsync<RawCategory>(`SELECT * FROM categories ORDER BY sort_order ASC`);
}

export async function getCategoryById(
  db: SQLiteDatabase,
  id: string
): Promise<RawCategory | null> {
  return db.getFirstAsync<RawCategory>(`SELECT * FROM categories WHERE id = ?`, [id]);
}

export async function getCategoryByName(
  db: SQLiteDatabase,
  name: string
): Promise<RawCategory | null> {
  return db.getFirstAsync<RawCategory>(`SELECT * FROM categories WHERE name = ? LIMIT 1`, [name]);
}

export async function getCategoriesByFlowType(
  db: SQLiteDatabase,
  flowType: 'IN' | 'OUT' | 'BOTH'
): Promise<RawCategory[]> {
  if (flowType === 'IN' || flowType === 'OUT') {
    return db.getAllAsync<RawCategory>(
      `SELECT * FROM categories WHERE flow_type = ? OR flow_type = 'BOTH' ORDER BY sort_order ASC`,
      [flowType]
    );
  }
  return db.getAllAsync<RawCategory>(
    `SELECT * FROM categories WHERE flow_type = 'BOTH' ORDER BY sort_order ASC`
  );
}
