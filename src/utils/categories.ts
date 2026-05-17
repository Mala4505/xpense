export const DEFAULT_CATEGORIES = [
  // ── IN categories ──
  { name: 'Salary',         flow_type: 'IN',   khumus_eligible: true,  is_loan_type: false, color: '#22C87A', icon: 'briefcase-outline',       is_system: true,  sort_order: 1  },
  { name: 'Freelance',      flow_type: 'IN',   khumus_eligible: true,  is_loan_type: false, color: '#4ADE80', icon: 'laptop-outline',           is_system: true,  sort_order: 2  },
  { name: 'Gift Received',  flow_type: 'IN',   khumus_eligible: true,  is_loan_type: false, color: '#A78BFA', icon: 'gift-outline',             is_system: true,  sort_order: 3  },
  { name: 'Refund',         flow_type: 'IN',   khumus_eligible: false, is_loan_type: false, color: '#38BDF8', icon: 'refresh-outline',          is_system: true,  sort_order: 4  },
  { name: 'Investment',     flow_type: 'IN',   khumus_eligible: true,  is_loan_type: false, color: '#FB923C', icon: 'trending-up-outline',      is_system: true,  sort_order: 5  },
  { name: 'Found Money',    flow_type: 'IN',   khumus_eligible: true,  is_loan_type: false, color: '#FBBF24', icon: 'search-outline',           is_system: true,  sort_order: 6  },
  { name: 'Other Income',   flow_type: 'IN',   khumus_eligible: false, is_loan_type: false, color: '#94A3B8', icon: 'add-circle-outline',       is_system: true,  sort_order: 7  },

  // ── OUT categories ──
  { name: 'Daily Expenses', flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#E05C5C', icon: 'bag-outline',              is_system: true,  sort_order: 10 },
  { name: 'Grocery',        flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#F87171', icon: 'cart-outline',             is_system: true,  sort_order: 11 },
  { name: 'Bills',          flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#FB923C', icon: 'flash-outline',            is_system: true,  sort_order: 12 },
  { name: 'Shopping',       flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#F472B6', icon: 'pricetag-outline',         is_system: true,  sort_order: 13 },
  { name: 'Medical',        flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#34D399', icon: 'heart-outline',            is_system: true,  sort_order: 14 },
  { name: 'Education',      flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#60A5FA', icon: 'book-outline',             is_system: true,  sort_order: 15 },
  { name: 'Gift Given',     flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#C084FC', icon: 'gift-outline',             is_system: true,  sort_order: 16 },
  { name: 'Sadaqah',        flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#2DD4BF', icon: 'heart-circle-outline',     is_system: true,  sort_order: 17 },
  { name: 'Wakaf',          flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#4ADE80', icon: 'home-outline',             is_system: true,  sort_order: 18 },
  { name: 'Nazrul Maqam',   flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#F0B429', icon: 'star-outline',             is_system: true,  sort_order: 19 },
  { name: 'Other Expense',  flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#94A3B8', icon: 'remove-circle-outline',    is_system: true,  sort_order: 20 },

  // ── LOAN categories (is_loan_type: true = direction locked, NEVER khumus) ──
  { name: 'Loan Given',       flow_type: 'OUT', khumus_eligible: false, is_loan_type: true, color: '#C48A00', icon: 'arrow-up-circle-outline',   is_system: true, sort_order: 30 },
  { name: 'Loan Received',    flow_type: 'IN',  khumus_eligible: false, is_loan_type: true, color: '#C48A00', icon: 'arrow-down-circle-outline', is_system: true, sort_order: 31 },
  { name: 'Loan Repaid',      flow_type: 'IN',  khumus_eligible: false, is_loan_type: true, color: '#C48A00', icon: 'arrow-undo-outline',        is_system: true, sort_order: 32 },
  { name: 'I Repaid Loan',    flow_type: 'OUT', khumus_eligible: false, is_loan_type: true, color: '#C48A00', icon: 'arrow-redo-outline',        is_system: true, sort_order: 33 },

  // ── KHUMUS payment ──
  { name: 'Khumus Paid',    flow_type: 'OUT',  khumus_eligible: false, is_loan_type: false, color: '#F0B429', icon: 'checkmark-circle-outline', is_system: true,  sort_order: 40 },
];
