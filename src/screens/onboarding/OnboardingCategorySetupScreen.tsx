import React, { useState, useMemo } from 'react';
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
import { useColors } from '../../theme/useColors';
import type { ColorScheme } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useSettingsStore } from '../../stores/settingsStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { DEFAULT_CATEGORIES } from '../../utils/categories';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingCategorySetup'>;

function ProgressBars({ filled }: { filled: number }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: 6 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressBar,
            { backgroundColor: i < filled ? colors.brandNavy : colors.surfaceElevated },
          ]}
        />
      ))}
    </View>
  );
}

interface CategoryDef {
  name: string;
  icon: string;
  color: string;
  flow_type: string;
}

const INCOME_CATEGORIES = DEFAULT_CATEGORIES.filter(
  (c) => !c.is_loan_type && c.flow_type === 'IN'
);

const EXPENSE_CATEGORIES = DEFAULT_CATEGORIES.filter(
  (c) => !c.is_loan_type && (c.flow_type === 'OUT' || c.flow_type === 'BOTH')
);

const DEFAULT_SELECTED = ['Salary', 'Investment', 'Daily Expenses', 'Grocery', 'Sadaqah'];

function CategoryCard({
  item,
  selected,
  onToggle,
}: {
  item: CategoryDef;
  selected: boolean;
  onToggle: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={[styles.catCard, selected && styles.catCardSelected]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      {selected && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={10} color={colors.textOnYellow} />
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
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
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
          <Ionicons name="arrow-forward" size={20} color={colors.textOnYellow} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
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
    backgroundColor: colors.brandPale,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
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
    color: colors.textMuted,
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
    color: colors.textMuted,
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
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  catCardSelected: {
    borderWidth: 2,
    borderColor: colors.accentLavender,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accentLavender,
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
    color: colors.textMuted,
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.textOnYellow,
  },
});
