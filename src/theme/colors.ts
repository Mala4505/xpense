export const colors = {
  // Brand
  brandNavy: '#1E1058',
  brandViolet: '#9B6EF0',
  brandYellow: '#EDD900',
  brandPurple: '#5B35D4',
  brandPale: '#EEEAF8',

  // Surfaces
  surfaceBg: '#F5F4FC',
  surfaceCard: '#FFFFFF',
  surfaceBorder: '#EEE8F8',
  surfaceElevated: '#EDE9FA',

  // Text
  textPrimary: '#1A1040',
  textSecondary: '#5B35D4',
  textMuted: '#9080B8',
  textDisabled: '#C0B8E0',
  textInverse: '#FFFFFF',

  // Semantic
  income: '#22C87A',
  incomeBg: '#E8F8F0',
  expense: '#E05C5C',
  expenseBg: '#FEEDED',
  khumus: '#F0B429',
  khumusBg: '#FFF8E0',
  loan: '#C48A00',
  loanBg: '#FFF3D0',
  pending: '#3B82F6',
  pendingBg: '#EFF6FF',
} as const;

export type ColorToken = keyof typeof colors;
