import React, { useMemo } from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { useColors } from '../../theme/useColors';
import type { ColorScheme } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

interface StatusBadgeProps {
  status: 'completed' | 'pending' | 'partial' | 'cancelled';
  flow: 'IN' | 'OUT';
  style?: ViewStyle;
}

const buildBadgeConfig = (colors: ColorScheme) => ({
  completed: {
    IN:  { bg: colors.incomeBg,     text: colors.income,       label: 'Received'  },
    OUT: { bg: colors.expenseBg,    text: colors.expense,      label: 'Paid'      },
  },
  pending: {
    IN:  { bg: colors.pendingBg,    text: colors.pending,      label: 'Pending'   },
    OUT: { bg: colors.pendingBg,    text: colors.pending,      label: 'Pending'   },
  },
  partial: {
    IN:  { bg: colors.khumusBg,     text: colors.khumus,       label: 'Partial'   },
    OUT: { bg: colors.khumusBg,     text: colors.khumus,       label: 'Partial'   },
  },
  cancelled: {
    IN:  { bg: colors.surfaceElevated, text: colors.textMuted, label: 'Cancelled' },
    OUT: { bg: colors.surfaceElevated, text: colors.textMuted, label: 'Cancelled' },
  },
});

export function StatusBadge({ status, flow, style }: StatusBadgeProps) {
  const colors = useColors();
  const badgeConfig = useMemo(() => buildBadgeConfig(colors), [colors]);
  const cfg = badgeConfig[status][flow];

  return (
    <View
      style={[
        {
          backgroundColor: cfg.bg,
          borderRadius: 100,
          paddingHorizontal: 7,
          paddingVertical: 2,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 10,
          color: cfg.text,
          letterSpacing: 0.3,
        }}
      >
        {cfg.label}
      </Text>
    </View>
  );
}
