import React, { useState } from 'react';
import {
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
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useSettingsStore } from '../../stores/settingsStore';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingCategorySetup'>;

function ProgressBars({ filled }: { filled: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: 6 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressBar,
            { backgroundColor: i < filled ? colors.brandNavy : '#e9ddff' },
          ]}
        />
      ))}
    </View>
  );
}

interface CategoryItem {
  name: string;
  icon: string;
  color: string;
  flow: 'IN' | 'OUT';
}

const INCOME_CATEGORIES: CategoryItem[] = [
  { name: 'Salary',       icon: 'cash-outline',           color: colors.income,    flow: 'IN' },
  { name: 'Freelance',    icon: 'briefcase-outline',       color: colors.income,    flow: 'IN' },
  { name: 'Gift Received',icon: 'gift-outline',            color: colors.income,    flow: 'IN' },
  { name: 'Investment',   icon: 'trending-up-outline',     color: colors.income,    flow: 'IN' },
  { name: 'Other Income', icon: 'add-circle-outline',      color: colors.income,    flow: 'IN' },
];

const EXPENSE_CATEGORIES: CategoryItem[] = [
  { name: 'Daily Expenses', icon: 'bag-outline',           color: colors.expense,   flow: 'OUT' },
  { name: 'Grocery',        icon: 'cart-outline',           color: colors.expense,   flow: 'OUT' },
  { name: 'Bills',          icon: 'flash-outline',          color: colors.expense,   flow: 'OUT' },
  { name: 'Medical',        icon: 'medkit-outline',         color: colors.expense,   flow: 'OUT' },
  { name: 'Sadaqah',        icon: 'heart-outline',          color: colors.expense,   flow: 'OUT' },
  { name: 'Wakaf',          icon: 'business-outline',       color: colors.expense,   flow: 'OUT' },
  { name: 'Khumus Paid',    icon: 'star-outline',           color: colors.expense,   flow: 'OUT' },
];

const DEFAULT_SELECTED = ['Salary', 'Investment', 'Daily Expenses', 'Grocery', 'Sadaqah'];

function CategoryCard({
  item,
  selected,
  onToggle,
}: {
  item: CategoryItem;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.catCard, selected && styles.catCardSelected]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      {selected && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={10} color="white" />
        </View>
      )}
      <View style={[styles.catIconCircle, { backgroundColor: colors.brandPale }]}>
        <Ionicons name={item.icon as any} size={22} color={item.color} />
      </View>
      <Text style={[styles.catCardLabel, selected && styles.catCardLabelSelected]} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
}

export default function OnboardingCategorySetupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const setPinnedCategoryNames = useSettingsStore((s) => s.setPinnedCategoryNames);
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_SELECTED));

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function handleContinue() {
    setPinnedCategoryNames(Array.from(selected));
    navigation.navigate('OnboardingLaunchpad');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={18} color="#797581" />
          </View>
          <Text style={styles.headerTitle}>Finance Tracker</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} onPress={() => {}}>
          <Ionicons name="notifications-outline" size={22} color={colors.brandNavy} />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step header */}
        <View style={styles.stepHeader}>
          <Text style={styles.stepLabel}>STEP 5 OF 6</Text>
          <Text style={styles.title}>The Category Setup</Text>
          <Text style={styles.subtitle}>Select the categories you frequently use.</Text>
        </View>

        {/* Progress */}
        <ProgressBars filled={5} />

        {/* Income section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.income }]} />
            <Text style={[styles.sectionTitle, { color: colors.income }]}>INCOME</Text>
          </View>
          <View style={styles.catGrid}>
            {INCOME_CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.name}
                item={cat}
                selected={selected.has(cat.name)}
                onToggle={() => toggle(cat.name)}
              />
            ))}
          </View>
        </View>

        {/* Expenses section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.expense }]} />
            <Text style={[styles.sectionTitle, { color: colors.expense }]}>EXPENSES</Text>
          </View>
          <View style={styles.catGrid}>
            {EXPENSE_CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.name}
                item={cat}
                selected={selected.has(cat.name)}
                onToggle={() => toggle(cat.name)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Pinned CTA */}
      <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.ctaButton} onPress={handleContinue} activeOpacity={0.9}>
          <Text style={styles.ctaText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.brandNavy} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eee4ff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    color: colors.brandNavy,
    letterSpacing: -0.4,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  stepHeader: {
    marginBottom: 16,
  },
  stepLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#797581',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 30,
    color: colors.textPrimary,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: '#484550',
  },

  // ── Progress ──────────────────────────────────────────────────────────────
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  // ── Category card ─────────────────────────────────────────────────────────
  catCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  catCardSelected: {
    borderWidth: 2,
    borderColor: '#aa7dff',
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#aa7dff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catCardLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#484550',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  catCardLabelSelected: {
    color: colors.textPrimary,
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.surfaceBg,
    borderTopWidth: 0,
  },
  ctaButton: {
    backgroundColor: colors.brandYellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 100,
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.brandNavy,
  },
});
