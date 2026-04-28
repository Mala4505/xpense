export type Flow = 'IN' | 'OUT';
export type TransactionStatus = 'completed' | 'pending' | 'partial' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'gpay' | 'bank' | 'cheque' | 'other';
export type FlowType = 'IN' | 'OUT' | 'BOTH';
export type LoanType = 'lent' | 'borrowed';
export type LoanStatus = 'active' | 'partial' | 'settled';

export interface Transaction {
  id: string;
  flow: Flow;
  amount: number;
  currency: string;
  category_id: string;
  status: TransactionStatus;
  paid_amount: number;
  method: PaymentMethod;
  note?: string;
  loan_id?: string;
  khumus_share?: number;
  created_at: number;
  updated_at: number;
}

export interface Category {
  id: string;
  name: string;
  flow_type: FlowType;
  khumus_eligible: boolean;
  is_loan_type: boolean;
  color: string;
  icon: string;
  is_system: boolean;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface Loan {
  id: string;
  type: LoanType;
  person_name: string;
  principal: number;
  currency: string;
  status: LoanStatus;
  created_at: number;
  updated_at: number;
}

export interface ComputedLoan extends Loan {
  total_repaid: number;
  remaining: number;
}
