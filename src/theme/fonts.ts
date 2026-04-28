export const fonts = {
  sansBold: 'PlusJakartaSans_700Bold',
  sansMedium: 'PlusJakartaSans_500Medium',
  sans: 'PlusJakartaSans_400Regular',
  monoBold: 'SpaceMono_700Bold',
  mono: 'SpaceMono_400Regular',
} as const;

export type FontToken = keyof typeof fonts;
