import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { formatAmount } from '../utils/currency';
import { formatTransactionDate, formatTransactionTime } from '../utils/date';
import { useKhumusData, useKhumusBreakdown } from '../hooks/useComputed';
import { useKhumusPaidHistory } from '../hooks/useTransactions';
import { useSettingsStore } from '../stores/settingsStore';
import { useOverlayStore } from '../stores/overlayStore';


export default function KhumusScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const openOverlay = useOverlayStore((s) => s.openOverlay);

  const { accumulated, paid, due } = useKhumusData();
  const breakdown = useKhumusBreakdown();
  const history = useKhumusPaidHistory();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Khumus</Text>
        <View style={{ width: 22 }} />
      </MotiView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Stats Cards */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 60, damping: 22, stiffness: 280 }}
          style={styles.statsRow}
        >
          {/* Accumulated */}
          <View style={[styles.statCard, styles.statCardPurple]}>
            <View style={[styles.statIconWrap, styles.statIconWrapPurple]}>
              <Ionicons name="layers-outline" size={22} color={colors.brandViolet} />
            </View>
            <Text style={styles.statLabel}>Accumulated</Text>
            <Text
              style={[styles.statAmount, { color: colors.brandViolet }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {currency} {formatAmount(accumulated)}
            </Text>
          </View>

          {/* Paid */}
          <View style={[styles.statCard, styles.statCardGreen]}>
            <View style={[styles.statIconWrap, styles.statIconWrapGreen]}>
              <Ionicons name="checkmark-circle-outline" size={22} color={colors.income} />
            </View>
            <Text style={styles.statLabel}>Paid</Text>
            <Text
              style={[styles.statAmount, { color: colors.income }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {currency} {formatAmount(paid)}
            </Text>
          </View>

          {/* Due */}
          <View style={[styles.statCard, styles.statCardYellow]}>
            <View style={[styles.statIconWrap, styles.statIconWrapYellow]}>
              <Ionicons name="alert-circle-outline" size={22} color={colors.khumus} />
            </View>
            <Text style={styles.statLabel}>Remaining Due</Text>
            <Text
              style={[styles.statAmount, { color: due > 0 ? colors.khumus : colors.textMuted }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {currency} {formatAmount(due)}
            </Text>
          </View>
        </MotiView>

        {due > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 100, damping: 22, stiffness: 280 }}
            style={styles.dueWarning}
          >
            <Ionicons name="information-circle-outline" size={13} color={colors.brandYellow} />
            <Text style={styles.dueWarningText}>
              {currency} {formatAmount(due)} is due for payment
            </Text>
          </MotiView>
        )}

        {/* Pay Khumus Button */}
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 120, damping: 20, stiffness: 300 }}
        >
          <TouchableOpacity style={styles.payBtn} onPress={openOverlay} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.payBtnText}>Pay Khumus</Text>
          </TouchableOpacity>
        </MotiView>

        {/* Category Breakdown */}
        {breakdown.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 160, damping: 22, stiffness: 280 }}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>By Category</Text>
            <View style={styles.card}>
              {breakdown.map((item, i) => (
                <View key={item.categoryId}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.breakdownRow}>
                    <View
                      style={[
                        styles.catDot,
                        { backgroundColor: item.categoryColor + '40' },
                      ]}
                    >
                      <View
                        style={[
                          styles.catDotInner,
                          { backgroundColor: item.categoryColor },
                        ]}
                      />
                    </View>
                    <View style={styles.breakdownMid}>
                      <Text style={styles.breakdownName}>{item.categoryName}</Text>
                      <Text style={styles.breakdownSub}>
                        Total: {currency} {formatAmount(item.total)}
                      </Text>
                    </View>
                    <View style={styles.breakdownRight}>
                      <Text style={styles.breakdownKhumus}>
                        {currency} {formatAmount(item.khumusShare)}
                      </Text>
                      <Text style={styles.breakdownKhumusLabel}>1/5 share</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </MotiView>
        )}

        {/* Payment History */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 200, damping: 22, stiffness: 280 }}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Payment History</Text>
          {history.length === 0 ? (
            <View style={[styles.card, styles.emptyHistoryCard]}>
              <Text style={styles.emptyText}>No khumus payments recorded yet</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {history.map((tx, i) => (
                <View key={tx.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyDate}>
                        {formatTransactionDate(tx.created_at)}
                      </Text>
                      <Text style={styles.historyTime}>
                        {formatTransactionTime(tx.created_at)} · {tx.method}
                      </Text>
                      {tx.note ? (
                        <Text style={styles.historyNote}>{tx.note}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.historyAmount}>
                      − {tx.currency} {formatAmount(tx.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </MotiView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    gap: 4,
  },
  /* Stats cards row */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: 1,
  },
  statCardPurple: {
    backgroundColor: 'rgba(155,110,240,0.09)',
    borderColor: 'rgba(155,110,240,0.22)',
  },
  statCardGreen: {
    backgroundColor: 'rgba(34,200,122,0.09)',
    borderColor: 'rgba(34,200,122,0.22)',
  },
  statCardYellow: {
    backgroundColor: 'rgba(240,180,41,0.09)',
    borderColor: 'rgba(240,180,41,0.22)',
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconWrapPurple: {
    backgroundColor: 'rgba(155,110,240,0.18)',
  },
  statIconWrapGreen: {
    backgroundColor: 'rgba(34,200,122,0.18)',
  },
  statIconWrapYellow: {
    backgroundColor: 'rgba(240,180,41,0.18)',
  },
  statLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  statAmount: {
    fontFamily: fonts.mono,
    fontSize: 18,
    letterSpacing: -0.4,
  },
  dueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(240,180,41,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  dueWarningText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.brandYellow,
  },
  /* Pay button */
  payBtn: {
    backgroundColor: colors.brandYellow,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  payBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  /* Sections */
  section: {
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 14,
  },
  /* Breakdown rows */
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  catDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownMid: {
    flex: 1,
    gap: 2,
  },
  breakdownName: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  breakdownSub: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  breakdownRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  breakdownKhumus: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.khumus,
    letterSpacing: -0.2,
  },
  breakdownKhumusLabel: {
    fontFamily: fonts.sans,
    fontSize: 9,
    color: colors.textDisabled,
  },
  /* History */
  emptyHistoryCard: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textDisabled,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyLeft: {
    gap: 2,
    flex: 1,
  },
  historyDate: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  historyTime: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  historyNote: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  historyAmount: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.khumus,
    letterSpacing: -0.2,
  },
});
