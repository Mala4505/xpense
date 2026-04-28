import React from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

interface StatusBadgeProps {
  status: 'completed' | 'pending' | 'partial' | 'cancelled';
  flow: 'IN' | 'OUT';
  style?: ViewStyle;
}

const BADGE_CONFIG = {
  completed: {
    IN:  { bg: colors.incomeBg,  text: colors.income,       label: 'Received'  },
    OUT: { bg: colors.expenseBg, text: colors.expense,      label: 'Paid'      },
  },
  pending: {
    IN:  { bg: colors.pendingBg, text: colors.pending,      label: 'Pending'   },
    OUT: { bg: colors.pendingBg, text: colors.pending,      label: 'Pending'   },
  },
  partial: {
    IN:  { bg: colors.khumusBg,  text: colors.khumus,       label: 'Partial'   },
    OUT: { bg: colors.khumusBg,  text: colors.khumus,       label: 'Partial'   },
  },
  cancelled: {
    IN:  { bg: '#F5F2FA',        text: colors.textMuted,    label: 'Cancelled' },
    OUT: { bg: '#F5F2FA',        text: colors.textMuted,    label: 'Cancelled' },
  },
};

export function StatusBadge({ status, flow, style }: StatusBadgeProps) {
  const cfg = BADGE_CONFIG[status][flow];

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
          fontSize: 9,
          color: cfg.text,
          letterSpacing: 0.3,
        }}
      >
        {cfg.label}
      </Text>
    </View>
  );
}
