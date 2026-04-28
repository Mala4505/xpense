import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { formatAmount } from '../utils/currency';
import { formatTransactionDate } from '../utils/date';
import { useLoans } from '../hooks/useCategories';
import { useSettingsStore } from '../stores/settingsStore';
import { useOverlayStore } from '../stores/overlayStore';
import { ComputedLoan } from '../types';

type TabType = 'lent' | 'borrowed';

function StatusBadge({ status }: { status: 'active' | 'partial' | 'settled' }) {
  const configs = {
    active: { bg: colors.pendingBg, text: colors.pending, label: 'Active' },
    partial: { bg: colors.khumusBg, text: colors.khumus, label: 'Partial' },
    settled: { bg: colors.incomeBg, text: colors.income, label: 'Settled' },
  };
  const cfg = configs[status];
  return (
    <View style={[loanStyles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[loanStyles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={loanStyles.progressTrack}>
      <MotiView
        from={{ width: '0%' }}
        animate={{ width: `${Math.round(clamped * 100)}%` }}
        transition={{ type: 'spring', delay: 200, damping: 22, stiffness: 200 }}
        style={[
          loanStyles.progressFill,
          { backgroundColor: clamped >= 1 ? colors.income : colors.loan },
        ]}
      />
    </View>
  );
}

function LoanCard({
  loan,
  currency,
  animationIndex,
  onLogRepayment,
}: {
  loan: ComputedLoan;
  currency: string;
  animationIndex: number;
  onLogRepayment: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const progress = loan.total_repaid / loan.principal;
  const isSettled = loan.status === 'settled';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: isSettled ? 0.6 : 1, translateY: 0 }}
      transition={{ type: 'spring', delay: 80 + animationIndex * 60, damping: 22, stiffness: 280 }}
      style={[loanStyles.card, isSettled && loanStyles.cardSettled]}
    >
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
        style={loanStyles.cardHeader}
      >
        <View style={loanStyles.cardLeft}>
          <View style={loanStyles.personInitial}>
            <Text style={loanStyles.personInitialText}>
              {loan.person_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={loanStyles.cardMeta}>
            <Text style={loanStyles.personName}>{loan.person_name}</Text>
            <Text style={loanStyles.loanDate}>
              Since {formatTransactionDate(loan.created_at)}
            </Text>
          </View>
        </View>
        <View style={loanStyles.cardRight}>
          <StatusBadge status={loan.status} />
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textMuted}
            style={{ marginTop: 4 }}
          />
        </View>
      </TouchableOpacity>

      <View style={loanStyles.amountRow}>
        <View style={loanStyles.amountItem}>
          <Text style={loanStyles.amountLabel}>Principal</Text>
          <Text style={loanStyles.amountValue}>
            {currency} {formatAmount(loan.principal)}
          </Text>
        </View>
        <View style={loanStyles.amountItem}>
          <Text style={loanStyles.amountLabel}>Repaid</Text>
          <Text style={[loanStyles.amountValue, { color: colors.income }]}>
            {currency} {formatAmount(loan.total_repaid)}
          </Text>
        </View>
        <View style={loanStyles.amountItem}>
          <Text style={loanStyles.amountLabel}>Outstanding</Text>
          <Text
            style={[
              loanStyles.amountValue,
              { color: isSettled ? colors.income : colors.expense },
            ]}
          >
            {currency} {formatAmount(loan.remaining)}
          </Text>
        </View>
      </View>

      <ProgressBar progress={progress} />
      <Text style={loanStyles.progressLabel}>
        {Math.round(progress * 100)}% repaid
      </Text>

      <AnimatePresence>
        {expanded && !isSettled && (
          <MotiView
            key="repay-btn"
            from={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 44 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'timing', duration: 180 }}
            style={loanStyles.expandedArea}
          >
            <TouchableOpacity
              style={loanStyles.repayBtn}
              onPress={onLogRepayment}
              activeOpacity={0.85}
            >
              <Ionicons name="return-down-forward-outline" size={15} color={colors.loan} />
              <Text style={loanStyles.repayBtnText}>Log Repayment</Text>
            </TouchableOpacity>
          </MotiView>
        )}
      </AnimatePresence>
    </MotiView>
  );
}

export default function LoansScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const openOverlay = useOverlayStore((s) => s.openOverlay);
  const loans = useLoans();
  const [activeTab, setActiveTab] = useState<TabType>('lent');

  const lentLoans = useMemo(() => loans.filter((l) => l.type === 'lent'), [loans]);
  const borrowedLoans = useMemo(() => loans.filter((l) => l.type === 'borrowed'), [loans]);

  const peopleOweMe = useMemo(
    () => lentLoans.filter((l) => l.status !== 'settled').reduce((s, l) => s + l.remaining, 0),
    [lentLoans]
  );
  const iOwe = useMemo(
    () => borrowedLoans.filter((l) => l.status !== 'settled').reduce((s, l) => s + l.remaining, 0),
    [borrowedLoans]
  );
  const net = peopleOweMe - iOwe;

  const displayLoans = activeTab === 'lent' ? lentLoans : borrowedLoans;
  const activeFirst = [...displayLoans.filter((l) => l.status !== 'settled'), ...displayLoans.filter((l) => l.status === 'settled')];

  return (
    <View style={[loanStyles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        style={loanStyles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={loanStyles.headerTitle}>Loans</Text>
        <View style={{ width: 22 }} />
      </MotiView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          loanStyles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Summary row */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 60, damping: 22, stiffness: 280 }}
          style={loanStyles.summaryCard}
        >
          <View style={loanStyles.summaryItem}>
            <Text style={loanStyles.summaryLabel}>People Owe Me</Text>
            <Text style={[loanStyles.summaryValue, { color: colors.income }]}>
              {currency} {formatAmount(peopleOweMe)}
            </Text>
          </View>
          <View style={loanStyles.summaryDivider} />
          <View style={loanStyles.summaryItem}>
            <Text style={loanStyles.summaryLabel}>I Owe</Text>
            <Text style={[loanStyles.summaryValue, { color: colors.expense }]}>
              {currency} {formatAmount(iOwe)}
            </Text>
          </View>
          <View style={loanStyles.summaryDivider} />
          <View style={loanStyles.summaryItem}>
            <Text style={loanStyles.summaryLabel}>Net</Text>
            <Text
              style={[
                loanStyles.summaryValue,
                { color: net >= 0 ? colors.income : colors.expense },
              ]}
            >
              {net >= 0 ? '+' : '−'} {currency} {formatAmount(Math.abs(net))}
            </Text>
          </View>
        </MotiView>

        {/* Tabs */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', delay: 100, duration: 200 }}
          style={loanStyles.tabRow}
        >
          {(['lent', 'borrowed'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[loanStyles.tab, activeTab === tab && loanStyles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[loanStyles.tabText, activeTab === tab && loanStyles.tabTextActive]}>
                {tab === 'lent' ? 'I Lent' : 'I Borrowed'}
              </Text>
            </TouchableOpacity>
          ))}
        </MotiView>

        {/* Loan cards */}
        {activeFirst.length === 0 ? (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', delay: 150, duration: 250 }}
            style={loanStyles.emptyWrap}
          >
            <Ionicons name="link-outline" size={36} color={colors.textDisabled} />
            <Text style={loanStyles.emptyText}>
              {activeTab === 'lent' ? 'No loans given yet' : 'No borrowed loans yet'}
            </Text>
          </MotiView>
        ) : (
          <View style={loanStyles.loanList}>
            {activeFirst.map((loan, i) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                currency={currency}
                animationIndex={i}
                onLogRepayment={openOverlay}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const loanStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  /* Summary */
  summaryCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  summaryValue: {
    fontFamily: fonts.mono,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  summaryDivider: {
    width: 0.5,
    height: 36,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 8,
  },
  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.surfaceCard,
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  /* Loan list */
  loanList: {
    gap: 10,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textDisabled,
  },
  /* Loan card */
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  cardSettled: {
    borderColor: colors.incomeBg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  personInitial: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.loanBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personInitialText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.loan,
  },
  cardMeta: {
    gap: 2,
  },
  personName: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  loanDate: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  /* Amount row */
  amountRow: {
    flexDirection: 'row',
    gap: 0,
  },
  amountItem: {
    flex: 1,
    gap: 3,
  },
  amountLabel: {
    fontFamily: fonts.sans,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  amountValue: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  /* Progress */
  progressTrack: {
    height: 5,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
  },
  /* Expanded repay */
  expandedArea: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  repayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.loan,
    borderRadius: 10,
    paddingVertical: 9,
  },
  repayBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.loan,
  },
});
