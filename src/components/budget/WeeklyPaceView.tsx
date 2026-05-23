import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import {
  addWeeks,
  differenceInDays,
  getDaysInMonth,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { formatAmount } from '../../utils/currency';
import { useBudgetStore } from '../../stores/budgetStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface WeekData {
  label: string;
  actual: number;
  target: number;
  isCurrent: boolean;
  isFuture: boolean;
}

interface WeeklyPaceViewProps {
  onBack: () => void;
}

export function WeeklyPaceView({ onBack }: WeeklyPaceViewProps) {
  const db = useSQLiteContext();
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const budgets = useBudgetStore((s) => s.budgets);
  const projectedMonthEnd = useBudgetStore((s) => s.projectedMonthEnd);
  const weeklyPace = useBudgetStore((s) => s.weeklyPace);

  const overall = budgets.find((b) => b.categoryId === null);
  const monthLimit = overall?.amountLimit ?? 0;
  const totalSpent = overall?.amountSpent ?? 0;

  const [weeks, setWeeks] = useState<WeekData[]>([]);

  const totalSpentRef = useRef(totalSpent);
  totalSpentRef.current = totalSpent;

  useEffect(() => {
    buildWeeks();
  }, [totalSpent, monthLimit]);

  useFocusEffect(
    React.useCallback(() => {
      buildWeeks();
    }, [])
  );

  async function buildWeeks() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const totalDays = getDaysInMonth(now);
    const daysElapsed = differenceInDays(now, monthStart) + 1;
    const currentSpent = totalSpentRef.current;
    const dailyRate = daysElapsed > 0 ? currentSpent / daysElapsed : 0;
    const dailyTarget = monthLimit > 0 ? monthLimit / totalDays : 0;

    const result: WeekData[] = [];
    let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });

    while (!isAfter(weekStart, monthEnd)) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const effStart = weekStart < monthStart ? monthStart : weekStart;
      const effEnd = weekEnd > monthEnd ? monthEnd : weekEnd;

      const daysInThisWeek = differenceInDays(effEnd, effStart) + 1;
      const target = dailyTarget * daysInThisWeek;

      const isFuture = isAfter(effStart, now);
      const isCurrent = !isAfter(effStart, now) && !isBefore(effEnd, now);

      let actual = 0;
      if (isFuture) {
        actual = dailyRate * daysInThisWeek;
      } else {
        const endTs = isCurrent ? Date.now() : effEnd.getTime();
        const rows = await db.getAllAsync<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) AS total
           FROM transactions
           WHERE flow = 'OUT' AND status != 'cancelled'
             AND created_at BETWEEN ? AND ?`,
          [effStart.getTime(), endTs]
        );
        actual = rows[0]?.total ?? 0;
      }

      const endDay = format(effEnd, 'd');
      const startStr = format(effStart, 'MMM d');
      result.push({
        label: `${startStr}–${endDay}`,
        actual,
        target,
        isCurrent,
        isFuture,
      });

      weekStart = addWeeks(weekStart, 1);
    }

    setWeeks(result);
  }

  const now = new Date();
  const daysLeft = differenceInDays(endOfMonth(now), now);
  const onTrack = monthLimit === 0 || projectedMonthEnd <= monthLimit;

  return (
    <View>
      {/* Back button */}
      <TouchableOpacity style={wStyles.backRow} onPress={onBack} activeOpacity={0.75}>
        <Ionicons name="chevron-back" size={18} color={colors.brandViolet} />
        <Text style={wStyles.backText}>Monthly View</Text>
      </TouchableOpacity>

      {/* Projection card */}
      <View
        style={[
          wStyles.projCard,
          { backgroundColor: onTrack ? colors.incomeBg : colors.expenseBg },
        ]}
      >
        <Text style={[wStyles.projStatus, { color: onTrack ? colors.income : colors.expense }]}>
          {onTrack ? 'On Track' : 'Over Pace'}
        </Text>
        <Text style={wStyles.projMain}>
          On track to spend {currency} {formatAmount(projectedMonthEnd)}
        </Text>
        <Text style={wStyles.projSub}>
          {monthLimit > 0
            ? onTrack
              ? `${currency} ${formatAmount(monthLimit - projectedMonthEnd)} under budget · ${daysLeft} days left`
              : `${currency} ${formatAmount(projectedMonthEnd - monthLimit)} over budget`
            : `${daysLeft} days left this month`}
        </Text>
      </View>

      {/* Week bars */}
      <View style={wStyles.barsCard}>
        <Text style={wStyles.barsTitle}>Weekly Breakdown</Text>
        {weeks.map((week, i) => {
          const barPct =
            week.target > 0 ? Math.min((week.actual / week.target) * 100, 100) : 0;
          const overTarget = week.target > 0 && week.actual > week.target;
          const barCol = overTarget
            ? colors.expense
            : barPct >= 75
            ? colors.khumus
            : colors.income;

          return (
            <MotiView
              key={i}
              from={{ opacity: 0, translateX: -8 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'spring', delay: i * 50, damping: 22, stiffness: 280 }}
              style={wStyles.weekRow}
            >
              <View style={wStyles.weekLabelWrap}>
                <Text style={wStyles.weekLabel} numberOfLines={1}>
                  {week.label}
                </Text>
                {week.isCurrent && (
                  <View style={wStyles.nowBadge}>
                    <Text style={wStyles.nowBadgeText}>Now</Text>
                  </View>
                )}
                {week.isFuture && (
                  <View style={wStyles.projBadge}>
                    <Text style={wStyles.projBadgeText}>Projected</Text>
                  </View>
                )}
              </View>

              <View style={wStyles.barTrack}>
                <MotiView
                  from={{ width: '0%' }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ type: 'spring', delay: 80 + i * 50, damping: 22, stiffness: 180 }}
                  style={[
                    wStyles.barFill,
                    {
                      backgroundColor: week.isFuture ? colors.textDisabled : barCol,
                      opacity: week.isFuture ? 0.35 : 1,
                    },
                  ]}
                />
                {overTarget && !week.isFuture && (
                  <View style={wStyles.overflowMarker} />
                )}
              </View>

              <View style={wStyles.weekBottom}>
                <Text
                  style={[wStyles.weekAmt, week.isFuture && wStyles.weekAmtMuted]}
                  numberOfLines={1}
                >
                  {currency} {formatAmount(week.actual)}
                </Text>
                {week.target > 0 && (
                  <Text style={wStyles.weekTarget}>
                    / {currency} {formatAmount(week.target)}
                  </Text>
                )}
              </View>
            </MotiView>
          );
        })}
      </View>

      {/* Weekly average strip */}
      <View style={wStyles.avgRow}>
        <Ionicons name="pulse-outline" size={14} color={colors.pending} />
        <Text style={wStyles.avgText}>
          {currency} {formatAmount(weeklyPace)}/wk avg this month
        </Text>
      </View>
    </View>
  );
}

const wStyles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    paddingVertical: 4,
  },
  backText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.brandViolet,
  },
  projCard: {
    borderRadius: 16,
    padding: 14,
    gap: 4,
    marginBottom: 12,
  },
  projStatus: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
  projMain: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  projSub: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  barsCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    padding: 14,
    gap: 14,
    marginBottom: 12,
  },
  barsTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  weekRow: {
    gap: 5,
  },
  weekLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.textMuted,
    flex: 1,
  },
  nowBadge: {
    backgroundColor: colors.pendingBg,
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  nowBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.pending,
  },
  projBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  projBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textDisabled,
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  overflowMarker: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 6,
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.expense,
  },
  weekBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weekAmt: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  weekAmtMuted: {
    color: colors.textDisabled,
  },
  weekTarget: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: -0.2,
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.pendingBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avgText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.pending,
  },
});
