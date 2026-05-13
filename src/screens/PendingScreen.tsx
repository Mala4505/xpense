import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
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
import { formatTransactionDate, formatTransactionTime } from '../utils/date';
import { usePendingTransactions, RawTransaction } from '../hooks/useTransactions';
import { useCategoriesMap } from '../hooks/useCategories';
import { useSettingsStore } from '../stores/settingsStore';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { useSQLiteContext } from 'expo-sqlite';
import { updateTransaction } from '../queries/transactions';
import { useDataRefreshStore } from '../stores/dataRefreshStore';

function PendingCard({
  transaction,
  categoryName,
  categoryColor,
  currency,
  animationIndex,
  onMarkDone,
}: {
  transaction: RawTransaction;
  categoryName: string;
  categoryColor: string;
  currency: string;
  animationIndex: number;
  onMarkDone: () => void;
}) {
  const db = useSQLiteContext();
  const [marking, setMarking] = useState(false);
  const outstanding = transaction.amount - transaction.paid_amount;
  const isPartial = transaction.status === 'partial';

  async function handleMarkDone() {
    Alert.alert(
      'Mark as Done',
      `Mark "${categoryName}" ${transaction.flow === 'IN' ? 'received' : 'paid'} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Done',
          onPress: async () => {
            setMarking(true);
            try {
              await updateTransaction(db, transaction.id, { status: 'completed' });
              onMarkDone();
            } catch {
              Alert.alert('Error', 'Could not update transaction.');
            } finally {
              setMarking(false);
            }
          },
        },
      ]
    );
  }

  return (
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{
        type: 'spring',
        delay: animationIndex * 55,
        damping: 22,
        stiffness: 300,
      }}
      style={pendingStyles.card}
    >
      <View style={pendingStyles.cardTop}>
        <CategoryIcon name={categoryName} color={categoryColor} size={36} />
        <View style={pendingStyles.cardMeta}>
          <Text style={pendingStyles.cardName}>{categoryName}</Text>
          <Text style={pendingStyles.cardDate}>
            {formatTransactionDate(transaction.created_at)} · {formatTransactionTime(transaction.created_at)}
          </Text>
          <Text style={pendingStyles.cardMethod}>{transaction.method}</Text>
        </View>
        <View style={pendingStyles.cardAmounts}>
          <Text
            style={[
              pendingStyles.cardTotal,
              { color: transaction.flow === 'IN' ? colors.income : colors.expense },
            ]}
          >
            {transaction.flow === 'IN' ? '+' : '−'} {transaction.currency} {formatAmount(transaction.amount)}
          </Text>
          {isPartial && (
            <Text style={pendingStyles.cardOutstanding}>
              Due: {transaction.currency} {formatAmount(outstanding)}
            </Text>
          )}
        </View>
      </View>

      {transaction.note ? (
        <Text style={pendingStyles.note}>{transaction.note}</Text>
      ) : null}

      {isPartial && transaction.paid_amount > 0 && (
        <View style={pendingStyles.partialInfo}>
          <Ionicons name="checkmark-circle-outline" size={12} color={colors.income} />
          <Text style={pendingStyles.partialInfoText}>
            {transaction.currency} {formatAmount(transaction.paid_amount)} already paid
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[pendingStyles.markBtn, marking && pendingStyles.markBtnDisabled]}
        onPress={handleMarkDone}
        disabled={marking}
        activeOpacity={0.8}
      >
        <Ionicons
          name={marking ? 'hourglass-outline' : 'checkmark-circle-outline'}
          size={15}
          color={colors.textInverse}
        />
        <Text style={pendingStyles.markBtnText}>
          {marking ? 'Updating...' : 'Mark Done'}
        </Text>
      </TouchableOpacity>
    </MotiView>
  );
}

function SectionHeader({
  title,
  count,
  total,
  currency,
  flow,
}: {
  title: string;
  count: number;
  total: number;
  currency: string;
  flow: 'IN' | 'OUT';
}) {
  return (
    <View style={pendingStyles.sectionHeader}>
      <View style={pendingStyles.sectionLeft}>
        <View
          style={[
            pendingStyles.sectionDot,
            { backgroundColor: flow === 'IN' ? colors.income : colors.expense },
          ]}
        />
        <Text style={pendingStyles.sectionTitle}>{title}</Text>
        <View
          style={[
            pendingStyles.countBadge,
            { backgroundColor: flow === 'IN' ? colors.incomeBg : colors.expenseBg },
          ]}
        >
          <Text
            style={[
              pendingStyles.countText,
              { color: flow === 'IN' ? colors.income : colors.expense },
            ]}
          >
            {count}
          </Text>
        </View>
      </View>
      <Text style={pendingStyles.sectionTotal}>
        {currency} {formatAmount(total)}
      </Text>
    </View>
  );
}

export default function PendingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const pending = usePendingTransactions();
  const categoriesMap = useCategoriesMap();

  const refresh = useDataRefreshStore(s => s.refresh);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 500);
  }, [refresh]);

  const toReceive = useMemo(
    () => pending.filter((t) => t.flow === 'IN'),
    [pending]
  );
  const toPay = useMemo(
    () => pending.filter((t) => t.flow === 'OUT'),
    [pending]
  );

  const toReceiveTotal = toReceive.reduce(
    (s, t) => s + (t.amount - t.paid_amount),
    0
  );
  const toPayTotal = toPay.reduce((s, t) => s + (t.amount - t.paid_amount), 0);

  return (
    <View style={[pendingStyles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        style={pendingStyles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={pendingStyles.headerTitle}>Pending</Text>
        <View style={{ width: 22 }} />
      </MotiView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          pendingStyles.scrollContent,
          { paddingBottom: insets.bottom + 32, flexGrow: 1 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brandYellow]} />}
      >
        {pending.length === 0 ? (
          <MotiView
            from={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 80, damping: 22, stiffness: 280 }}
            style={pendingStyles.emptyWrap}
          >
            <View style={pendingStyles.emptyIcon}>
              <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.income} />
            </View>
            <Text style={pendingStyles.emptyTitle}>All clear!</Text>
            <Text style={pendingStyles.emptySubtitle}>No pending transactions</Text>
          </MotiView>
        ) : (
          <>
            {/* To Receive */}
            <AnimatePresence>
              {toReceive.length > 0 && (
                <MotiView
                  key="to-receive"
                  from={{ opacity: 0, translateY: 8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'spring', delay: 60, damping: 22, stiffness: 280 }}
                >
                  <SectionHeader
                    title="To Receive"
                    count={toReceive.length}
                    total={toReceiveTotal}
                    currency={currency}
                    flow="IN"
                  />
                  <View style={pendingStyles.sectionList}>
                    {toReceive.map((tx, i) => {
                      const cat = categoriesMap.get(tx.category_id);
                      return (
                        <PendingCard
                          key={tx.id}
                          transaction={tx}
                          categoryName={cat?.name ?? '...'}
                          categoryColor={cat?.color ?? colors.income}
                          currency={currency}
                          animationIndex={i}
                          onMarkDone={() => {}}
                        />
                      );
                    })}
                  </View>
                </MotiView>
              )}
            </AnimatePresence>

            {/* To Pay */}
            <AnimatePresence>
              {toPay.length > 0 && (
                <MotiView
                  key="to-pay"
                  from={{ opacity: 0, translateY: 8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'spring', delay: 100, damping: 22, stiffness: 280 }}
                >
                  <SectionHeader
                    title="To Pay"
                    count={toPay.length}
                    total={toPayTotal}
                    currency={currency}
                    flow="OUT"
                  />
                  <View style={pendingStyles.sectionList}>
                    {toPay.map((tx, i) => {
                      const cat = categoriesMap.get(tx.category_id);
                      return (
                        <PendingCard
                          key={tx.id}
                          transaction={tx}
                          categoryName={cat?.name ?? '...'}
                          categoryColor={cat?.color ?? colors.expense}
                          currency={currency}
                          animationIndex={toReceive.length + i}
                          onMarkDone={() => {}}
                        />
                      );
                    })}
                  </View>
                </MotiView>
              )}
            </AnimatePresence>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const pendingStyles = StyleSheet.create({
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
    gap: 0,
  },
  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingTop: 12,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  countBadge: {
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
  },
  sectionTotal: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: -0.2,
  },
  sectionList: {
    gap: 8,
    paddingBottom: 8,
  },
  /* Pending card */
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    padding: 14,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardMeta: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  cardDate: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  cardMethod: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textDisabled,
    textTransform: 'capitalize',
  },
  cardAmounts: {
    alignItems: 'flex-end',
    gap: 3,
  },
  cardTotal: {
    fontFamily: fonts.mono,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  cardOutstanding: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.khumus,
  },
  note: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingLeft: 46,
  },
  partialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 46,
  },
  partialInfoText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.income,
  },
  /* Mark done button */
  markBtn: {
    backgroundColor: colors.brandNavy,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  markBtnDisabled: {
    opacity: 0.5,
  },
  markBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textInverse,
  },
  /* Empty state */
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.incomeBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: colors.income,
  },
  emptySubtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textDisabled,
  },
});
