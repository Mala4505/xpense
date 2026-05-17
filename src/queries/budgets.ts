import * as SQLite from 'expo-sqlite';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as Crypto from 'expo-crypto';

export interface BudgetRow {
  id: string;
  category_id: string | null;
  amount_limit: number;
  amount_spent: number;
  currency: string;
  month: string;
}

export async function getBudgets(db: SQLite.SQLiteDatabase, month: Date): Promise<BudgetRow[]> {
  const monthKey = format(month, 'yyyy-MM');
  const startTs = startOfMonth(month).getTime();
  const now = new Date();
  const isCurrentMonth =
    format(month, 'yyyy-MM') === format(now, 'yyyy-MM');
  const endTs = isCurrentMonth ? Date.now() : endOfMonth(month).getTime();

  return db.getAllAsync<BudgetRow>(
    `SELECT
      b.id,
      b.category_id,
      b.amount_limit,
      b.currency,
      b.month,
      COALESCE(SUM(t.amount), 0) AS amount_spent
    FROM budgets b
    LEFT JOIN transactions t
      ON (b.category_id IS NULL OR t.category_id = b.category_id)
      AND t.flow = 'OUT'
      AND t.status != 'cancelled'
      AND t.created_at BETWEEN ? AND ?
    WHERE b.month = ?
    GROUP BY b.id`,
    [startTs, endTs, monthKey]
  );
}

export async function upsertBudget(
  db: SQLite.SQLiteDatabase,
  categoryId: string | null,
  limit: number,
  currency: string,
  month: Date
): Promise<void> {
  const monthKey = format(month, 'yyyy-MM');
  const now = Date.now();

  if (categoryId === null) {
    // For overall budget (NULL category_id), check if one exists for this month
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM budgets WHERE category_id IS NULL AND month = ?`,
      [monthKey]
    );
    if (existing) {
      await db.runAsync(
        `UPDATE budgets SET amount_limit = ?, updated_at = ? WHERE id = ?`,
        [limit, now, existing.id]
      );
    } else {
      const id = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO budgets (id, category_id, month, amount_limit, currency, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?)`,
        [id, monthKey, limit, currency, now, now]
      );
    }
  } else {
    await db.runAsync(
      `INSERT INTO budgets (id, category_id, month, amount_limit, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(category_id, month) DO UPDATE SET
         amount_limit = excluded.amount_limit,
         updated_at = excluded.updated_at`,
      [Crypto.randomUUID(), categoryId, monthKey, limit, currency, now, now]
    );
  }
}

export async function deleteBudget(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM budgets WHERE id = ?`, [id]);
}
