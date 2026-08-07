import { Flow, LoanType } from '../types';

// Categories 'Loan Given' / 'Loan Received' open a new loan record.
// 'Loan Repaid' / 'I Repaid Loan' settle an existing one instead of creating
// a duplicate — they must find the oldest open loan for that person/type.
export const LOAN_TYPE_BY_CATEGORY: Record<string, LoanType> = {
  'Loan Given': 'lent',
  'Loan Received': 'borrowed',
  'Loan Repaid': 'lent',
  'I Repaid Loan': 'borrowed',
};

export const LOAN_FLOW_BY_CATEGORY: Record<string, Flow> = {
  'Loan Given': 'OUT',
  'Loan Received': 'IN',
  'Loan Repaid': 'IN',
  'I Repaid Loan': 'OUT',
};

export const LOAN_CREATES_NEW_RECORD = new Set(['Loan Given', 'Loan Received']);
export const LOAN_IS_REPAYMENT = new Set(['Loan Repaid', 'I Repaid Loan']);

export const REPAYMENT_CATEGORY_NAME: Record<LoanType, string> = {
  lent: 'Loan Repaid',
  borrowed: 'I Repaid Loan',
};
