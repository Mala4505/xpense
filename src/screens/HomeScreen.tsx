import React, { useCallback, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { formatAmount } from '../utils/currency';
import { PendingStrip } from '../components/home/PendingStrip';
import { TransactionRow } from '../components/ui/TransactionRow';
import {
  useNetBalance,
  useIncomeTotal,
  useExpenseTotal,
  usePendingCount,
  usePendingTotal,
  useMonthComparison,
} from '../hooks/useComputed';
import { useRecentTransactions } from '../hooks/useTransactions';
import { useCategoriesMap } from '../hooks/useCategories';
import { useSettingsStore } from '../stores/settingsStore';
import { useNotificationsStore } from '../stores/notificationsStore';
import { useDataRefreshStore } from '../stores/dataRefreshStore';
import { NotificationsSheet } from '../components/home/NotificationsSheet';
import { RootStackParamList } from '../navigation/RootNavigator';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

// Upward-facing shadow on iOS replicates the HTML layered-shadow depth effect.
// Android uses increasing elevation values to maintain correct stacking order.
const iosShadow = {
  shadowColor: colors.brandNavy,
  shadowOffset: { width: 0, height: -10 },
  shadowOpacity: 0.15,
  shadowRadius: 20,
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNavProp>();

  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    useDataRefreshStore.getState().refresh();
    setTimeout(() => setRefreshing(false), 600);
  }, []);
  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const currency = useSettingsStore((s) => s.defaultCurrency);
  const netBalance = useNetBalance();
  const incomeTotal = useIncomeTotal();
  const expenseTotal = useExpenseTotal();
  const pendingCount = usePendingCount();
  const pendingTotal = usePendingTotal();
  const { incomePct, expensePct } = useMonthComparison();
  const recentTransactions = useRecentTransactions(3);
  const categoriesMap = useCategoriesMap();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brandNavy}
            colors={[colors.brandNavy]}
          />
        }
        horizontal={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
      {/* ── Top Nav ── */}
      <View style={styles.topNav}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AL</Text>
          </View>
          <Text style={styles.userName}>Aliasger</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} onPress={() => setShowNotifications(true)}>
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={styles.bellDot}>
              <Text style={styles.bellDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <NotificationsSheet visible={showNotifications} onClose={() => setShowNotifications(false)} />
      </View>

      {/* ── Balance Section (white) ── */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>
          {currency} {formatAmount(netBalance)}
        </Text>
        <View style={styles.changeRow}>
          <Ionicons
            name={incomePct >= 0 ? 'arrow-up' : 'arrow-down'}
            size={13}
            color={incomePct >= 0 ? colors.income : colors.expense}
          />
          <Text style={[styles.changeText, { color: incomePct >= 0 ? colors.income : colors.expense }]}>
            {incomePct >= 0 ? '+' : ''}{incomePct}% vs last month
          </Text>
        </View>
      </View>

      {/* ── Layer 1: Revenue (brandNavy, overlaps balance bottom) ── */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 80, damping: 22, stiffness: 280 }}
        style={[
          styles.revenueLayer,
          Platform.OS === 'ios' ? iosShadow : { elevation: 4 },
        ]}
      >
        <View style={styles.layerCardRow}>
          <View style={[styles.layerIconWrap, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Ionicons name="cash-outline" size={28} color={colors.textInverse} />
          </View>
          <View style={styles.layerTextCol}>
            <Text style={[styles.layerCardLabel, { color: 'rgba(200,192,248,0.65)' }]}>
              Total Revenue
            </Text>
            <Text style={styles.layerCardAmount}>
              {currency} {formatAmount(incomeTotal)}
            </Text>
          </View>
          <View style={[styles.trendBadge, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
            <Text style={styles.trendBadgeText}>{Math.abs(incomePct)}%</Text>
            <Ionicons
              name={incomePct >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={colors.textInverse}
            />
          </View>
        </View>
      </MotiView>

      {/* ── Layer 2: Expense (brandViolet, overlaps revenue) ── */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 180, damping: 22, stiffness: 280 }}
        style={[
          styles.expenseLayer,
          Platform.OS === 'ios' ? iosShadow : { elevation: 6 },
        ]}
      >
        <View style={styles.layerCardRow}>
          <View style={[styles.layerIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="wallet-outline" size={28} color={colors.textInverse} />
          </View>
          <View style={styles.layerTextCol}>
            <Text style={[styles.layerCardLabel, { color: 'rgba(255,255,255,0.7)' }]}>
              Total Expense
            </Text>
            <Text style={styles.layerCardAmount}>
              {currency} {formatAmount(expenseTotal)}
            </Text>
          </View>
          <View style={[styles.trendBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.trendBadgeText}>{Math.abs(expensePct)}%</Text>
            <Ionicons
              name={expensePct >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={colors.textInverse}
            />
          </View>
        </View>
      </MotiView>

      {/* ── Layer 3: Foreground (white, overlaps expense) ── */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 280, damping: 22, stiffness: 280 }}
        style={[
          styles.foregroundLayer,
          { paddingBottom: insets.bottom + 16 },
          Platform.OS === 'ios' ? iosShadow : { elevation: 8 },
        ]}
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('History')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeAllText}>See all →</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction list (max 3) */}
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={28} color={colors.textDisabled} />
            </View>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first</Text>
          </View>
        ) : (
          <View>
            {recentTransactions.map((tx, i) => (
              <View key={tx.id}>
                {i > 0 && <View style={styles.divider} />}
                <TransactionRow
                  transaction={tx}
                  category={categoriesMap.get(tx.category_id)}
                  animationIndex={i}
                />
              </View>
            ))}
          </View>
        )}

        {/* Pending strip — renders only when count > 0 */}
        <PendingStrip
          count={pendingCount}
          total={pendingTotal}
          currency={currency}
          onPress={() => navigation.navigate('Pending')}
        />

        {/* Quick access row */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.khumusBg }]}
            onPress={() => navigation.navigate('Khumus')}
          >
            <Ionicons name="star-outline" size={16} color={colors.khumus} />
            <Text style={[styles.quickCardLabel, { color: colors.khumus }]}>Khumus</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.khumus} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.loanBg }]}
            onPress={() => navigation.navigate('Loans')}
          >
            <Ionicons name="link-outline" size={16} color={colors.loan} />
            <Text style={[styles.quickCardLabel, { color: colors.loan }]}>Loans</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.loan} />
          </TouchableOpacity>
        </View>
      </MotiView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Top Nav ──────────────────────────────────────────────────────────────
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surfaceCard,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandNavy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.brandPale,
    letterSpacing: 0.5,
  },
  userName: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.expense,
    borderWidth: 1.5,
    borderColor: colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellDotText: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    color: '#fff',
    lineHeight: 11,
  },

  // ── Balance Section ───────────────────────────────────────────────────────
  balanceSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 52,
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
  },
  balanceLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontFamily: fonts.monoBold,
    fontSize: 40,
    color: colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },

  // ── Revenue Layer ─────────────────────────────────────────────────────────
  // Pulls 24px into balance bottom padding; large paddingBottom hides under expense layer.
  revenueLayer: {
    backgroundColor: colors.brandNavy,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 30,
    paddingBottom: 90,
    paddingHorizontal: 24,
    marginTop: -24,
    zIndex: 2,
  },

  // ── Expense Layer ─────────────────────────────────────────────────────────
  // Pulls 60px into revenue bottom padding; large paddingBottom hides under foreground.
  expenseLayer: {
    backgroundColor: colors.brandViolet,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 30,
    paddingBottom: 90,
    paddingHorizontal: 24,
    marginTop: -60,
    zIndex: 3,
  },

  // ── Foreground Layer ──────────────────────────────────────────────────────
  // Pulls 68px into expense bottom padding; sits on top as the content card.
  foregroundLayer: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 24,
    paddingHorizontal: 24,
    marginTop: -68,
    zIndex: 4,
    flex: 1,
  },

  // ── Shared layer card layout ──────────────────────────────────────────────
  layerCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  layerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layerTextCol: {
    flex: 1,
    gap: 4,
  },
  layerCardLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  layerCardAmount: {
    fontFamily: fonts.mono,
    fontSize: 23,
    color: colors.textInverse,
    letterSpacing: -0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  trendBadgeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textInverse,
  },

  // ── Foreground content ────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  seeAllText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.surfaceBorder,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  emptySubtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textDisabled,
  },

  // ── Quick access row ──────────────────────────────────────────────────────
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  quickCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  quickCardLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    flex: 1,
  },
});
