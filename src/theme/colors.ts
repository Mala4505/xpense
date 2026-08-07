export const lightColors = {
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

  // Extended tokens
  swipeEdit: '#5B35D4',
  overlayScrim: 'rgba(30, 16, 88, 0.45)',
  accentLavender: '#aa7dff',
  // Fixed dark ink for text/icons on brandYellow specifically. brandYellow
  // stays bright in both themes, so its foreground must stay dark in both
  // themes too — it does not track textPrimary/textInverse.
  textOnYellow: '#1E1058',
  // Unified shadow color for all shadowColor usages (violet-tinted ink, never
  // pure black, per the Tinted Neutral Rule).
  shadow: '#332B45',
} as const;

// Dark theme: neutrals are tinted toward the brand's violet hue (~oklch h280),
// matching how surfaceBg/surfaceCard are tinted lavender in light mode rather
// than flat gray. Yellow stays the hero accent; violet is the secondary
// accent for selected states, links, and secondary text.
export const darkColors = {
  // Brand
  brandNavy: '#8B6EF0',
  brandViolet: '#B8AEDB',
  brandYellow: '#F0E94A',
  brandPurple: '#8B6EF0',
  brandPale: '#2E2645',

  // Surfaces — violet-tinted, with Material-calibrated raw-channel steps
  // between tiers (WCAG contrast ratio badly underestimates perceptible
  // difference near-black, so steps are sized by eye/reference, not ratio).
  surfaceBg: '#0A0812',
  surfaceCard: '#1F1930',
  surfaceBorder: '#4A3F70',
  surfaceElevated: '#332A4F',

  // Text — same violet tint carried into the neutral text scale
  textPrimary: '#EDEAF4',
  textSecondary: '#B8AEDB',
  textMuted: '#A29BB5',
  textDisabled: '#5F5870',
  // Stays light in dark mode too: this is for text/icons drawn on top of
  // solid saturated accent fills (buttons, badges, colored stat cards) which
  // don't invert with theme — not the inverse of textPrimary.
  textInverse: '#FBFAFE',

  // Semantic — moderate rather than pastel, since these fill solid badges
  // (with a light icon on top) as well as read as text on dark surfaces.
  income: '#3DD98F',
  incomeBg: '#182018',
  expense: '#E96F68',
  expenseBg: '#241616',
  khumus: '#F0C258',
  khumusBg: '#241E12',
  loan: '#D9A93F',
  loanBg: '#241D10',
  pending: '#4E93EE',
  pendingBg: '#141C24',

  // Extended tokens
  swipeEdit: '#B8AEDB',
  overlayScrim: 'rgba(10, 8, 18, 0.7)',
  accentLavender: '#B8AEDB',
  textOnYellow: '#1E1058',
  // Unified shadow color for all shadowColor usages (violet-tinted ink, never
  // pure black, per the Tinted Neutral Rule).
  shadow: '#0F0C18',
} as const;

export const colors = lightColors;

export type ColorToken = keyof typeof lightColors;
export type ColorScheme = Record<ColorToken, string>;
