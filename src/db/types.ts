export interface RawTransaction {
  id: string;
  flow: 'IN' | 'OUT';
  amount: number;
  currency: string;
  category_id: string;
  status: 'completed' | 'pending' | 'partial' | 'cancelled';
  paid_amount: number;
  method: 'cash' | 'card' | 'gpay' | 'bank' | 'cheque' | 'other';
  note?: string | null;
  loan_id?: string | null;
  khumus_share?: number | null;
  created_at: number;
  updated_at: number;
}

export interface RawCategory {
  id: string;
  name: string;
  flow_type: 'IN' | 'OUT' | 'BOTH';
  khumus_eligible: number;  // 0 | 1
  is_loan_type: number;     // 0 | 1
  color: string;
  icon: string;
  is_system: number;        // 0 | 1
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface RawLoan {
  id: string;
  type: 'lent' | 'borrowed';
  person_name: string;
  principal: number;
  currency: string;
  status: 'active' | 'partial' | 'settled';
  created_at: number;
  updated_at: number;
}

export interface EnrichedLoan extends RawLoan {
  total_repaid: number;
  remaining: number;
}
