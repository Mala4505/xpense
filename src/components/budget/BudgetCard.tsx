import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MotiView } from 'moti';
import { differenceInDays, endOfMonth } from 'date-fns';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { formatAmount } from '../../utils/currency';
import type { BudgetEntry } from '../../stores/budgetStore';

interface BudgetCardProps {
  budget: BudgetEntry;
  monthLabel: string;
  onPress: () => void;
}

function barColor(pct: number): string {
  if (pct >= 90) return colors.expense;
  if (pct >= 75) return colors.khumus;
  return colors.income;
}

function badgeBg(pct: number): string {
  if (pct >= 90) return colors.expenseBg;
  if (pct >= 75) return colors.khumusBg;
  return colors.incomeBg;
}

export function BudgetCard({ budget, monthLabel, onPress }: BudgetCardProps) {
  const pct = Math.min(budget.percentUsed, 100);
  const overflow = budget.percentUsed > 100;
  const remaining = Math.max(budget.amountLimit - budget.amountSpent, 0);
  const daysLeft = differenceInDays(endOfMonth(new Date()), new Date());
  const barCol = barColor(budget.percentUsed);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Monthly Budget</Text>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeBg(budget.percentUsed) }]}>
          <Text style={[styles.badgeText, { color: barCol }]}>
            {Math.round(budget.percentUsed)}%
          </Text>
        </View>
      </View>

      <Text style={styles.amountText}>
        <Text style={{ color: barCol }}>
          {budget.currency} {formatAmount(budget.amountSpent)}
        </Text>
        <Text style={styles.limitText}> of {budget.currency} {formatAmount(budget.amountLimit)}</Text>
      </Text>

      <View style={styles.barTrack}>
        <MotiView
          from={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', damping: 22, stiffness: 200 }}
          style={[styles.barFill, { backgroundColor: barCol }]}
        />
        {overflow && <View style={[styles.overflowIndicator, { backgroundColor: colors.expense }]} />}
      </View>

      <Text style={styles.subtitle}>
        {overflow
          ? `Over budget by ${budget.currency} ${formatAmount(budget.amountSpent - budget.amountLimit)}`
          : `${budget.currency} ${formatAmount(remaining)} remaining · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  monthLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  amountText: {
    fontFamily: fonts.mono,
    fontSize: 22,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  limitText: {
    fontFamily: fonts.mono,
    fontSize: 17,
    color: colors.textMuted,
  },
  barTrack: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  overflowIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 6,
    height: '100%',
    borderRadius: 3,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
});
