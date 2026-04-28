import React, { useMemo, useState } from 'react';
import {
  Alert,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { TransactionRow } from '../components/ui/TransactionRow';
import { useAllTransactions, RawTransaction } from '../hooks/useTransactions';
import { useCategoriesMap } from '../hooks/useCategories';
import { useSettingsStore } from '../stores/settingsStore';
import { groupTransactionsByDate } from '../utils/date';
import { useSQLiteContext } from 'expo-sqlite';
import { deleteTransaction } from '../queries/transactions';
import { useAddSheetStore } from '../stores/addSheetStore';

type FilterType = 'All' | 'Income' | 'Expense' | 'Pending' | 'Partial' | 'Loans';

const FILTERS: FilterType[] = ['All', 'Income', 'Expense', 'Pending', 'Partial', 'Loans'];

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface Section {
  title: string;
  data: RawTransaction[];
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const allTransactions = useAllTransactions();
  const categoriesMap = useCategoriesMap();

  const openSheet = useAddSheetStore((s) => s.openSheet);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo<RawTransaction[]>(() => {
    return allTransactions.filter((t) => {
      if (deletedIds.has(t.id)) return false;
      if (activeFilter === 'Income' && t.flow !== 'IN') return false;
      if (activeFilter === 'Expense' && t.flow !== 'OUT') return false;
      if (activeFilter === 'Pending' && t.status !== 'pending') return false;
      if (activeFilter === 'Partial' && t.status !== 'partial') return false;
      if (activeFilter === 'Loans' && !t.loan_id) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const catName = categoriesMap.get(t.category_id)?.name?.toLowerCase() ?? '';
        const matchesNote = t.note?.toLowerCase().includes(q) ?? false;
        const matchesCat = catName.includes(q);
        const matchesAmount = t.amount.toString().includes(q);
        if (!matchesNote && !matchesCat && !matchesAmount) return false;
      }

      return true;
    });
  }, [allTransactions, activeFilter, searchQuery, categoriesMap, deletedIds]);

  const sections = useMemo<Section[]>(() => {
    const grouped = groupTransactionsByDate(filtered);
    return Object.entries(grouped).map(([date, txs]) => ({
      title: date,
      data: txs as RawTransaction[],
    }));
  }, [filtered]);

  function handleDelete(txId: string) {
    Alert.alert('Delete Transaction', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletedIds((prev) => new Set([...prev, txId]));
          try {
            await deleteTransaction(db, txId);
          } catch (e) {
            setDeletedIds((prev) => { const s = new Set(prev); s.delete(txId); return s; });
            Alert.alert('Error', 'Could not delete transaction.');
          }
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textDisabled} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ maxHeight: 40}}
      >
        {FILTERS.map((f) => (
          <FilterChip
            key={f}
            label={f}
            active={activeFilter === f}
            onPress={() => setActiveFilter(f)}
          />
        ))}
      </ScrollView>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', delay: 150, duration: 250 }}
          style={styles.emptyWrap}
        >
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={32} color={colors.textDisabled} />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery || activeFilter !== 'All' ? 'No results found' : 'No transactions yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery || activeFilter !== 'All'
              ? 'Try adjusting your search or filter'
              : 'Tap + to add your first transaction'}
          </Text>
        </MotiView>
      ) : (
        <SectionList
          style={{ flex: 1 }}
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, index }) => (
            <View style={styles.rowWrap}>
              <TransactionRow
                transaction={item}
                category={categoriesMap.get(item.category_id)}
                onDelete={() => handleDelete(item.id)}
                onEdit={() => openSheet(item.id)}
                animationIndex={index}
              />
              <View style={styles.rowDivider} />
            </View>
          )}
          ItemSeparatorComponent={() => null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
    marginBottom: 10,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  /* Filter chips */
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: colors.brandPale,
    maxHeight: 30,
  },
  chipActive: {
    backgroundColor: colors.brandNavy,
  },
  chipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.brandPurple,
  },
  chipTextActive: {
    color: colors.textInverse,
  },
  /* List */
  listContent: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  rowWrap: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
  },
  rowDivider: {
    height: 0,
  },
  /* Empty */
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 80,
  },
  emptyIcon: {
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
    fontSize: 15,
    color: colors.textMuted,
  },
  emptySubtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
