import * as Crypto from 'expo-crypto';
import { SQLiteDatabase } from 'expo-sqlite';
import { RawCategory } from '../db/types';
import { FlowType } from '../types';

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

export async function deleteCategory(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
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
