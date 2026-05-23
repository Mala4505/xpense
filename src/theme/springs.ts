export const springs = {
  snappy:  { type: 'spring' as const, damping: 20, stiffness: 320 },
  default: { type: 'spring' as const, damping: 22, stiffness: 280 },
  gentle:  { type: 'spring' as const, damping: 26, stiffness: 200 },
} as const;
