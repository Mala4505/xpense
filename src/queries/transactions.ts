import * as Crypto from 'expo-crypto';
import { SQLiteDatabase } from 'expo-sqlite';
import { RawTransaction } from '../db/types';
import { Flow, TransactionStatus, PaymentMethod } from '../types';

export interface CreateTransactionInput {
  flow: Flow;
  amount: number;
  currency: string;
  category_id: string;
  status: TransactionStatus;
  paid_amount?: number;
  method: PaymentMethod;
  note?: string | null;
  loan_id?: string | null;
  created_at?: number;
}

export async function createTransaction(
  db: SQLiteDatabase,
  input: CreateTransactionInput
): Promise<void> {
  const id = Crypto.randomUUID();
  const now = Date.now();
  const cat = await db.getFirstAsync<{ khumus_eligible: number; is_loan_type: number }>(
    `SELECT khumus_eligible, is_loan_type FROM categories WHERE id = ?`,
    [input.category_id]
  );
  const khumusShare =
    cat && cat.is_loan_type === 0 && cat.khumus_eligible === 1
      ? input.amount / 5
      : null;
  await db.runAsync(
    `INSERT INTO transactions
      (id, flow, amount, currency, category_id, status, paid_amount, method, note, loan_id, khumus_share, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, input.flow, input.amount, input.currency, input.category_id,
      input.status, input.paid_amount ?? 0, input.method,
      input.note ?? null, input.loan_id ?? null, khumusShare,
      input.created_at ?? now, now,
    ]
  );
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<CreateTransactionInput>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.flow !== undefined)        { fields.push('flow = ?');        values.push(patch.flow); }
  if (patch.amount !== undefined)      { fields.push('amount = ?');      values.push(patch.amount); }
  if (patch.currency !== undefined)    { fields.push('currency = ?');    values.push(patch.currency); }
  if (patch.category_id !== undefined) { fields.push('category_id = ?'); values.push(patch.category_id); }
  if (patch.status !== undefined)      { fields.push('status = ?');      values.push(patch.status); }
  if (patch.paid_amount !== undefined) { fields.push('paid_amount = ?'); values.push(patch.paid_amount); }
  if (patch.method !== undefined)      { fields.push('method = ?');      values.push(patch.method); }
  if (patch.note !== undefined)        { fields.push('note = ?');        values.push(patch.note ?? null); }
  if (patch.loan_id !== undefined)     { fields.push('loan_id = ?');     values.push(patch.loan_id ?? null); }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(Date.now(), id);
  await db.runAsync(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteTransaction(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
}

export async function getAllTransactions(db: SQLiteDatabase): Promise<RawTransaction[]> {
  return db.getAllAsync<RawTransaction>(`SELECT * FROM transactions ORDER BY created_at DESC`);
}

export async function getTransactionsByDateRange(
  db: SQLiteDatabase,
  start: number,
  end: number
): Promise<RawTransaction[]> {
  return db.getAllAsync<RawTransaction>(
    `SELECT * FROM transactions WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`,
    [start, end]
  );
}

export async function getTransactionsByCategory(
  db: SQLiteDatabase,
  categoryId: string
): Promise<RawTransaction[]> {
  return db.getAllAsync<RawTransaction>(
    `SELECT * FROM transactions WHERE category_id = ? ORDER BY created_at DESC`,
    [categoryId]
  );
}

export async function getTransactionsByLoan(
  db: SQLiteDatabase,
  loanId: string
): Promise<RawTransaction[]> {
  return db.getAllAsync<RawTransaction>(
    `SELECT * FROM transactions WHERE loan_id = ? ORDER BY created_at DESC`,
    [loanId]
  );
}

export async function getRecentTransactions(
  db: SQLiteDatabase,
  limit: number
): Promise<RawTransaction[]> {
  return db.getAllAsync<RawTransaction>(
    `SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}
