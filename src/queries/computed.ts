import { SQLiteDatabase } from 'expo-sqlite';

export interface PeriodSummary {
  income: number;
  expense: number;
  net: number;
  count: number;
}

export async function getNetBalance(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ net: number }>(
    `SELECT COALESCE(SUM(CASE WHEN flow='IN' THEN amount ELSE -amount END), 0) AS net
     FROM transactions`
  );
  return row?.net ?? 0;
}

export async function getPeriodSummary(
  db: SQLiteDatabase,
  start: number,
  end: number
): Promise<PeriodSummary> {
  const row = await db.getFirstAsync<PeriodSummary>(
    `SELECT
       COALESCE(SUM(CASE WHEN flow='IN' THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN flow='OUT' THEN amount ELSE 0 END), 0) AS expense,
       COALESCE(SUM(CASE WHEN flow='IN' THEN amount ELSE -amount END), 0) AS net,
       COUNT(*) AS count
     FROM transactions WHERE created_at >= ? AND created_at <= ?`,
    [start, end]
  );
  return row ?? { income: 0, expense: 0, net: 0, count: 0 };
}

export async function getKhumusDue(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ accumulated: number; paid: number }>(
    `SELECT
       COALESCE((SELECT SUM(khumus_share) FROM transactions WHERE flow='IN' AND khumus_share IS NOT NULL), 0) AS accumulated,
       COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.flow='OUT'
         AND t.category_id=(SELECT id FROM categories WHERE name='Khumus Paid' LIMIT 1)), 0) AS paid`
  );
  const acc = row?.accumulated ?? 0;
  const paid = row?.paid ?? 0;
  return Math.max(0, acc - paid);
}
