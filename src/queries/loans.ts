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
    (l.principal - COALESCE(SUM(t.paid_amount), 0)) AS remaining
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
