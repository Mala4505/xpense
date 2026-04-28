import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MotiView } from 'moti';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { formatAmount } from '../../utils/currency';

interface PendingStripProps {
  count: number;
  total: number;
  currency: string;
  onPress: () => void;
}

export function PendingStrip({ count, total, currency, onPress }: PendingStripProps) {
  if (count === 0) return null;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', delay: 320, damping: 22, stiffness: 300 }}
      style={styles.strip}
    >
      <View style={styles.left}>
        <View style={styles.dot} />
        <View style={styles.textCol}>
          <Text style={styles.countText}>
            {count} Pending
          </Text>
          <Text style={styles.totalText}>
            {currency} {formatAmount(total)} outstanding
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.viewBtn}
        onPress={onPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.viewBtnText}>View →</Text>
      </TouchableOpacity>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  strip: {
    backgroundColor: colors.pendingBg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.pending,
  },
  textCol: {
    gap: 1,
  },
  countText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#1D4ED8',
  },
  totalText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  viewBtn: {
    borderWidth: 1,
    borderColor: colors.pending,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  viewBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.pending,
  },
});
