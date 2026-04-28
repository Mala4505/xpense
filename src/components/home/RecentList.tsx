import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { TransactionRow } from '../ui/TransactionRow';
import { RawTransaction } from '../../hooks/useTransactions';
import { RawCategory } from '../../hooks/useCategories';

interface RecentListProps {
  transactions: RawTransaction[];
  categoriesMap: Map<string, RawCategory>;
  onSeeAll: () => void;
  onPressTransaction?: (tx: RawTransaction) => void;
}

function EmptyState() {
  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300, delay: 200 }}
      style={styles.emptyWrap}
    >
      <View style={styles.emptyIcon}>
        <Ionicons name="receipt-outline" size={28} color={colors.textDisabled} />
      </View>
      <Text style={styles.emptyTitle}>No transactions yet</Text>
      <Text style={styles.emptySubtitle}>Tap + to add your first</Text>
    </MotiView>
  );
}

export function RecentList({
  transactions,
  categoriesMap,
  onSeeAll,
  onPressTransaction,
}: RecentListProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: 360, damping: 22, stiffness: 280 }}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent</Text>
        <TouchableOpacity
          onPress={onSeeAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {transactions.length === 0 ? (
        <EmptyState />
      ) : (
        <View style={styles.list}>
          {transactions.map((tx, i) => (
            <View key={tx.id}>
              {i > 0 && <View style={styles.divider} />}
              <TransactionRow
                transaction={tx}
                category={categoriesMap.get(tx.category_id)}
                onPress={() => onPressTransaction?.(tx)}
                animationIndex={i}
              />
            </View>
          ))}
        </View>
      )}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    marginTop: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  seeAll: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.brandPurple,
  },
  list: {},
  divider: {
    height: 0.5,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 14,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  emptySubtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textDisabled,
  },
});
