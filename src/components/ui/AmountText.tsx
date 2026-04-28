import React from 'react';
import { Text, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { formatAmount } from '../../utils/currency';

interface AmountTextProps {
  amount: number;
  flow: 'IN' | 'OUT';
  currency: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: TextStyle;
}

const SIZE_MAP = {
  sm: 12,
  md: 15,
  lg: 20,
  xl: 28,
};

export function AmountText({ amount, flow, currency, size = 'md', style }: AmountTextProps) {
  const color = flow === 'IN' ? colors.income : colors.expense;
  const prefix = flow === 'IN' ? '+' : '−';
  const fontSize = SIZE_MAP[size];

  return (
    <Text
      style={[
        {
          fontFamily: fonts.mono,
          fontSize,
          color,
          letterSpacing: -0.3,
        },
        style,
      ]}
    >
      {prefix} {currency} {formatAmount(amount)}
    </Text>
  );
}
