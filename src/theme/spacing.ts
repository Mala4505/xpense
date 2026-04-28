export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  marginEdge: 20,
  gutter: 16,
  stackSm: 8,
  stackMd: 16,
  stackLg: 24,
} as const;

export type SpacingToken = keyof typeof spacing;
