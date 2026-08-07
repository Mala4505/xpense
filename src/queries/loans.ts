import * as Crypto from 'expo-crypto';
import { SQLiteDatabase } from 'expo-sqlite';
import { EnrichedLoan, RawLoan } from '../db/types';
import { LoanType } from '../types';

export interface CreateLoanInput {
  type: LoanType;
  person_name: string;
  principal: number;
  currency: string;
}

const ENRICHED_SQL = (where = '') => `
  SELECT l.*,
    COALESCE(SUM(t.paid_amount), 0) AS total_repaid,
    MAX(l.principal - COALESCE(SUM(t.paid_amount), 0), 0) AS remaining
  FROM loans l
  LEFT JOIN transactions t ON t.loan_id = l.id AND t.status != 'cancelled'
  ${where}
  GROUP BY l.id
  ORDER BY l.created_at DESC
`;

export async function createLoan(
  db: SQLiteDatabase,
  input: CreateLoanInput
): Promise<string> {
  const id = Crypto.randomUUID();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO loans (id, type, person_name, principal, currency, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
    [id, input.type, input.person_name, input.principal, input.currency, now, now]
  );
  return id;
}

export async function updateLoanPrincipal(
  db: SQLiteDatabase,
  id: string,
  principal: number
): Promise<void> {
  await db.runAsync(
    `UPDATE loans SET principal = ?, updated_at = ? WHERE id = ?`,
    [principal, Date.now(), id]
  );
}

export async function updateLoanStatus(
  db: SQLiteDatabase,
  id: string,
  status: RawLoan['status']
): Promise<void> {
  await db.runAsync(
    `UPDATE loans SET status = ?, updated_at = ? WHERE id = ?`,
    [status, Date.now(), id]
  );
}

export async function deleteLoan(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM loans WHERE id = ?`, [id]);
}

export async function getAllLoans(db: SQLiteDatabase): Promise<EnrichedLoan[]> {
  return db.getAllAsync<EnrichedLoan>(ENRICHED_SQL());
}

export async function getLoansByType(
  db: SQLiteDatabase,
  type: LoanType
): Promise<EnrichedLoan[]> {
  return db.getAllAsync<EnrichedLoan>(
    ENRICHED_SQL('WHERE l.type = ?'),
    [type]
  );
}

// Repayments should settle the loan that's been outstanding longest for that
// person, not the most recent one — matches how someone actually expects
// "I repaid X" to be applied.
export async function findOldestOpenLoan(
  db: SQLiteDatabase,
  type: LoanType,
  personName: string
): Promise<RawLoan | null> {
  const row = await db.getFirstAsync<RawLoan>(
    `SELECT * FROM loans
     WHERE type = ? AND status != 'settled' AND LOWER(TRIM(person_name)) = LOWER(TRIM(?))
     ORDER BY created_at ASC LIMIT 1`,
    [type, personName]
  );
  return row ?? null;
}

// Recomputes a loan's status from its linked repayment transactions.
// Call after inserting a transaction with this loan_id + paid_amount.
export async function refreshLoanStatus(db: SQLiteDatabase, loanId: string): Promise<void> {
  const row = await db.getFirstAsync<{ principal: number; total_repaid: number }>(
    `SELECT l.principal AS principal, COALESCE(SUM(t.paid_amount), 0) AS total_repaid
     FROM loans l
     LEFT JOIN transactions t ON t.loan_id = l.id AND t.status != 'cancelled'
     WHERE l.id = ?
     GROUP BY l.id`,
    [loanId]
  );
  if (!row) return;
  // Epsilon guards against float rounding (e.g. 99.999999 vs 100) missing "settled".
  const SETTLED_EPSILON = 0.005;
  const status: RawLoan['status'] =
    row.total_repaid >= row.principal - SETTLED_EPSILON
      ? 'settled'
      : row.total_repaid > 0
        ? 'partial'
        : 'active';
  await updateLoanStatus(db, loanId, status);
}
