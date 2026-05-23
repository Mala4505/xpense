import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { formatAmount } from '../../utils/currency';
import type { BudgetEntry } from '../../stores/budgetStore';

interface CategoryBudgetRowProps {
  budget: BudgetEntry;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  index: number;
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

export function CategoryBudgetRow({
  budget,
  categoryName,
  categoryColor,
  categoryIcon,
  index,
  onPress,
}: CategoryBudgetRowProps) {
  const pct = Math.min(budget.percentUsed, 100);
  const barCol = barColor(budget.percentUsed);

  return (
    <MotiView
      from={{ opacity: 0, translateX: -10 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'spring', delay: 60 + index * 40, damping: 22, stiffness: 280 }}
    >
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
        <View style={[styles.iconWrap, { backgroundColor: categoryColor + '22' }]}>
          <Ionicons name={categoryIcon as any} size={16} color={categoryColor} />
        </View>

        <View style={styles.mid}>
          <View style={styles.topRow}>
            <Text style={styles.catName} numberOfLines={1}>{categoryName}</Text>
            <View style={[styles.badge, { backgroundColor: badgeBg(budget.percentUsed) }]}>
              <Text style={[styles.badgeText, { color: barCol }]}>
                {Math.round(budget.percentUsed)}%
              </Text>
            </View>
          </View>

          <View style={styles.barTrack}>
            <MotiView
              from={{ width: '0%' }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', delay: 100 + index * 40, damping: 22, stiffness: 200 }}
              style={[styles.barFill, { backgroundColor: barCol }]}
            />
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.spentText}>
              {budget.currency} {formatAmount(budget.amountSpent)}
            </Text>
            <Text style={styles.limitText}>
              of {budget.currency} {formatAmount(budget.amountLimit)}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
      </TouchableOpacity>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mid: {
    flex: 1,
    gap: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catName: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
  },
  barTrack: {
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spentText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  limitText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: -0.2,
  },
});
