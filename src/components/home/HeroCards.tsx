import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { formatAmount } from '../../utils/currency';

interface HeroCardsProps {
  incomeTotal: number;
  expenseTotal: number;
  currency: string;
  incomePct: number;
  expensePct: number;
}

function PctBadge({ pct }: { pct: number }) {
  return (
    <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
      <Ionicons
        name={pct >= 0 ? 'arrow-up' : 'arrow-down'}
        size={9}
        color={colors.textInverse}
      />
      <Text style={styles.badgeText}>{Math.abs(pct)}%</Text>
    </View>
  );
}

export function HeroCards({
  incomeTotal,
  expenseTotal,
  currency,
  incomePct,
  expensePct,
}: HeroCardsProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.stackedArea}>
        {/* Revenue card — violet, full width */}
        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 100, damping: 22, stiffness: 280 }}
          style={styles.revenueCard}
        >
          <View style={styles.cardLeft}>
            <Text style={styles.cardLabel}>Total Revenue</Text>
            <Text style={styles.cardAmount}>
              {currency} {formatAmount(incomeTotal)}
            </Text>
          </View>
          <PctBadge pct={incomePct} />
        </MotiView>

        {/* Expense card — navy, inset, overlaps revenue card bottom */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 200, damping: 22, stiffness: 280 }}
          style={styles.expenseCard}
        >
          <View style={styles.cardLeft}>
            <Text style={styles.cardLabel}>Total Expense</Text>
            <Text style={styles.cardAmount}>
              {currency} {formatAmount(expenseTotal)}
            </Text>
          </View>
          <PctBadge pct={expensePct} />
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
  },
  stackedArea: {
    position: 'relative',
  },
  /* Revenue card — violet, full width */
  revenueCard: {
    backgroundColor: colors.brandViolet,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  /* Expense card — navy, inset, overlaps revenue card */
  expenseCard: {
    backgroundColor: colors.brandNavy,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -16,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  cardLeft: {
    gap: 4,
  },
  cardLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.3,
  },
  cardAmount: {
    fontFamily: fonts.mono,
    fontSize: 19,
    color: colors.textInverse,
    letterSpacing: -0.3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  badgeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.textInverse,
    letterSpacing: 0.2,
  },
});
