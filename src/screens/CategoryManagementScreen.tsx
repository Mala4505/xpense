import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { useCategories, RawCategory } from '../hooks/useCategories';
import { useSettingsStore } from '../stores/settingsStore';
import { createCategory, updateCategory, deleteCategory } from '../queries/categories';
import { useDataRefreshStore } from '../stores/dataRefreshStore';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { FlowType } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#22C87A', '#4ADE80', '#A78BFA', '#38BDF8', '#FB923C',
  '#FBBF24', '#F87171', '#F472B6', '#34D399', '#60A5FA',
  '#E05C5C', '#9B6EF0', '#C48A00', '#F0B429', '#94A3B8',
];

const SWIPE_THRESHOLD = 70;
const DELETE_PANEL_WIDTH = 76;

// ─── Types ────────────────────────────────────────────────────────────────────

type DividerItem = { type: 'divider'; id: string };
type SectionItem = RawCategory | DividerItem;

function isDivider(item: SectionItem): item is DividerItem {
  return (item as DividerItem).type === 'divider';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortCategories(cats: RawCategory[]): RawCategory[] {
  return [...cats].sort((a, b) => {
    if (a.is_system === 1 && b.is_system === 1) return a.sort_order - b.sort_order;
    if (a.is_system === 1) return -1;
    if (b.is_system === 1) return 1;
    return a.name.localeCompare(b.name);
  });
}

function buildSectionItems(
  cats: RawCategory[],
  pinnedNames: string[]
): SectionItem[] {
  const on = sortCategories(cats.filter((c) => pinnedNames.includes(c.name)));
  const off = sortCategories(cats.filter((c) => !pinnedNames.includes(c.name)));
  if (on.length > 0 && off.length > 0) {
    return [...on, { type: 'divider', id: '__divider__' } as DividerItem, ...off];
  }
  return [...on, ...off];
}

// ─── SystemInfoSheet ──────────────────────────────────────────────────────────

function SystemInfoSheet({
  category,
  onClose,
}: {
  category: RawCategory | null;
  onClose: () => void;
}) {
  if (!category) return null;

  const directionLabel =
    category.flow_type === 'IN' ? 'Income' :
    category.flow_type === 'OUT' ? 'Expense' : 'Both';

  const directionColor =
    category.flow_type === 'IN' ? colors.income :
    category.flow_type === 'OUT' ? colors.expense : colors.khumus;

  const directionBg =
    category.flow_type === 'IN' ? colors.incomeBg :
    category.flow_type === 'OUT' ? colors.expenseBg : colors.khumusBg;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={sysStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={sysStyles.sheet}>
          <View style={sysStyles.handle} />
          <View style={sysStyles.header}>
            <Text style={sysStyles.title}>{category.name}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={sysStyles.infoBlock}>
            {/* Direction */}
            <View style={sysStyles.infoRow}>
              <Text style={sysStyles.infoLabel}>Direction</Text>
              <View style={[sysStyles.chip, { backgroundColor: directionBg }]}>
                <Text style={[sysStyles.chipText, { color: directionColor }]}>
                  {directionLabel}
                </Text>
              </View>
            </View>

            <View style={sysStyles.separator} />

            {/* Khumus */}
            <View style={sysStyles.infoRow}>
              <Text style={sysStyles.infoLabel}>Khumus eligible</Text>
              <View
                style={[
                  sysStyles.chip,
                  { backgroundColor: category.khumus_eligible ? colors.khumusBg : colors.surfaceElevated },
                ]}
              >
                <Text
                  style={[
                    sysStyles.chipText,
                    { color: category.khumus_eligible ? colors.khumus : colors.textDisabled },
                  ]}
                >
                  {category.khumus_eligible ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>

            <View style={sysStyles.separator} />

            {/* Type */}
            <View style={sysStyles.infoRow}>
              <Text style={sysStyles.infoLabel}>Type</Text>
              <View style={[sysStyles.chip, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[sysStyles.chipText, { color: colors.textMuted }]}>
                  System Category
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── AddEditCategorySheet ─────────────────────────────────────────────────────

function AddEditCategorySheet({
  visible,
  category,
  allCategories,
  onClose,
}: {
  visible: boolean;
  category: RawCategory | undefined;
  allCategories: RawCategory[];
  onClose: () => void;
}) {
  const db = useSQLiteContext();
  const pinnedCategoryNames = useSettingsStore((s) => s.pinnedCategoryNames);
  const setPinnedCategoryNames = useSettingsStore((s) => s.setPinnedCategoryNames);

  const isEdit = category !== undefined;

  const [name, setName] = useState('');
  const [flowType, setFlowType] = useState<FlowType>('OUT');
  const [khumus, setKhumus] = useState(false);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset state whenever the sheet opens
  const prevVisibleRef = useRef(false);
  if (visible && !prevVisibleRef.current) {
    if (isEdit) {
      setName(category.name);
      setFlowType(category.flow_type);
      setKhumus(category.khumus_eligible === 1);
      setColor(category.color);
    } else {
      setName('');
      setFlowType('OUT');
      setKhumus(false);
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    }
    setNameError('');
    setSaving(false);
  }
  prevVisibleRef.current = visible;

  function handleNameBlur() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const match = allCategories.find(
      (c) => c.name.toLowerCase() === lower && (!isEdit || c.id !== category?.id)
    );
    if (!match) {
      setNameError('');
      return;
    }
    const isOn = pinnedCategoryNames.includes(match.name);
    if (!isOn) {
      Alert.alert(
        `'${match.name}' already exists but is hidden`,
        'Turn it on?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Turn On',
            onPress: () => {
              setPinnedCategoryNames([...pinnedCategoryNames, match.name]);
              onClose();
            },
          },
        ]
      );
    } else {
      setNameError('This category is already active.');
    }
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name is required.');
      return;
    }
    if (nameError) return;
    setSaving(true);
    try {
      if (!isEdit) {
        await createCategory(db, {
          name: trimmed,
          flow_type: flowType,
          khumus_eligible: khumus && flowType !== 'OUT',
          color,
          icon: 'circle',
        });
        setPinnedCategoryNames([...pinnedCategoryNames, trimmed]);
      } else {
        const oldName = category.name;
        await updateCategory(db, category.id, {
          name: trimmed,
          flow_type: flowType,
          khumus_eligible: khumus && flowType !== 'OUT',
          color,
          icon: category.icon,
        });
        if (trimmed !== oldName) {
          setPinnedCategoryNames(
            pinnedCategoryNames.map((n) => (n === oldName ? trimmed : n))
          );
        }
      }
      useDataRefreshStore.getState().refresh();
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save the category. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const title = isEdit ? 'Edit Category' : 'New Category';
  const showKhumus = flowType !== 'OUT';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={sheetStyles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />

          <View style={sheetStyles.header}>
            <Text style={sheetStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={sheetStyles.scrollContent}
          >
            {/* Name */}
            <View style={sheetStyles.fieldBlock}>
              <Text style={sheetStyles.fieldLabel}>Name</Text>
              <TextInput
                style={[sheetStyles.input, nameError ? sheetStyles.inputError : undefined]}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (nameError) setNameError('');
                }}
                onBlur={handleNameBlur}
                placeholder="e.g. Freelance Income"
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="words"
                returnKeyType="done"
              />
              {nameError ? (
                <Text style={sheetStyles.errorText}>{nameError}</Text>
              ) : null}
            </View>

            {/* Direction chips */}
            <View style={sheetStyles.fieldBlock}>
              <Text style={sheetStyles.fieldLabel}>Direction</Text>
              <View style={sheetStyles.chipRow}>
                {(['IN', 'OUT', 'BOTH'] as FlowType[]).map((ft) => {
                  const active = flowType === ft;
                  const label =
                    ft === 'IN' ? 'Income' : ft === 'OUT' ? 'Expense' : 'Both';
                  const activeColor =
                    ft === 'IN' ? colors.income :
                    ft === 'OUT' ? colors.expense : colors.khumus;
                  const activeBg =
                    ft === 'IN' ? colors.incomeBg :
                    ft === 'OUT' ? colors.expenseBg : colors.khumusBg;
                  return (
                    <TouchableOpacity
                      key={ft}
                      style={[
                        sheetStyles.dirChip,
                        active && { backgroundColor: activeBg, borderColor: activeColor },
                      ]}
                      onPress={() => setFlowType(ft)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          sheetStyles.dirChipText,
                          active && { color: activeColor, fontFamily: fonts.sansBold },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Khumus toggle */}
            {showKhumus && (
              <View style={sheetStyles.toggleRow}>
                <View style={sheetStyles.toggleMid}>
                  <Text style={sheetStyles.toggleLabel}>Khumus eligible</Text>
                  <Text style={sheetStyles.toggleSub}>
                    Mark income from this category for Khumus calculation
                  </Text>
                </View>
                <Switch
                  value={khumus}
                  onValueChange={setKhumus}
                  trackColor={{ false: colors.surfaceBorder, true: colors.brandViolet + '66' }}
                  thumbColor={khumus ? colors.brandViolet : colors.textDisabled}
                />
              </View>
            )}

            {/* Color swatches */}
            <View style={sheetStyles.fieldBlock}>
              <Text style={sheetStyles.fieldLabel}>Color</Text>
              <View style={sheetStyles.swatchGrid}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      sheetStyles.swatch,
                      { backgroundColor: c },
                      color === c && sheetStyles.swatchSelected,
                    ]}
                    onPress={() => setColor(c)}
                    activeOpacity={0.8}
                  >
                    {color === c && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Save button */}
          <View style={sheetStyles.footer}>
            <TouchableOpacity
              style={[sheetStyles.saveBtn, saving && sheetStyles.saveBtnDisabled]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              <Text style={sheetStyles.saveBtnText}>
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Category'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── SwipeableCategoryRow ─────────────────────────────────────────────────────

function SwipeableCategoryRow({
  category,
  isOn,
  onToggle,
  onPressRow,
  onDelete,
}: {
  category: RawCategory;
  isOn: boolean;
  onToggle: () => void;
  onPressRow: () => void;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        const base = isOpen.current ? -DELETE_PANEL_WIDTH : 0;
        const clamped = Math.max(-(DELETE_PANEL_WIDTH + 10), Math.min(0, base + gs.dx));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, gs) => {
        if (!isOpen.current && gs.dx < -SWIPE_THRESHOLD) {
          isOpen.current = true;
          Animated.spring(translateX, { toValue: -DELETE_PANEL_WIDTH, useNativeDriver: true, bounciness: 0 }).start();
        } else if (isOpen.current && gs.dx > 20) {
          isOpen.current = false;
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        } else {
          Animated.spring(translateX, {
            toValue: isOpen.current ? -DELETE_PANEL_WIDTH : 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    })
  ).current;

  function close() {
    isOpen.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  }

  function handleDelete() {
    close();
    onDelete();
  }

  return (
    <View style={rowStyles.swipeWrap}>
      {/* Red delete panel revealed on swipe */}
      <View style={rowStyles.deleteBackground}>
        <TouchableOpacity style={rowStyles.deleteAction} onPress={handleDelete} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={16} color={colors.textInverse} />
          <Text style={rowStyles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Sliding content */}
      <Animated.View
        style={[rowStyles.rowSlide, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={rowStyles.rowBody}
          onPress={() => {
            if (isOpen.current) { close(); return; }
            onPressRow();
          }}
          activeOpacity={0.75}
        >
          <View style={[rowStyles.dot, { backgroundColor: category.color }]} />
          <Text
            style={[
              rowStyles.name,
              { fontFamily: isOn ? fonts.sansMedium : fonts.sans },
              { color: isOn ? colors.textPrimary : colors.textMuted },
            ]}
            numberOfLines={1}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
        <Switch
          value={isOn}
          onValueChange={() => {
            if (isOpen.current) { close(); return; }
            onToggle();
          }}
          trackColor={{ false: colors.surfaceBorder, true: colors.brandViolet + '66' }}
          thumbColor={isOn ? colors.brandViolet : colors.textDisabled}
          style={rowStyles.switchControl}
        />
      </Animated.View>
    </View>
  );
}

// ─── LoanCategoryRow ──────────────────────────────────────────────────────────

function LoanCategoryRow({ category }: { category: RawCategory }) {
  return (
    <View style={rowStyles.rowBase}>
      <View style={[rowStyles.dot, { backgroundColor: category.color }]} />
      <Text
        style={[rowStyles.name, { fontFamily: fonts.sansMedium, color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
      <Ionicons name="lock-closed-outline" size={16} color={colors.textDisabled} />
    </View>
  );
}

// ─── SystemCategoryRow ────────────────────────────────────────────────────────

function SystemCategoryRow({
  category,
  isOn,
  onToggle,
  onPress,
}: {
  category: RawCategory;
  isOn: boolean;
  onToggle: () => void;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={rowStyles.rowBase} onPress={onPress} activeOpacity={0.75}>
      <View style={[rowStyles.dot, { backgroundColor: category.color }]} />
      <Text
        style={[
          rowStyles.name,
          { fontFamily: isOn ? fonts.sansMedium : fonts.sans },
          { color: isOn ? colors.textPrimary : colors.textMuted },
        ]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
      <Switch
        value={isOn}
        onValueChange={onToggle}
        trackColor={{ false: colors.surfaceBorder, true: colors.brandViolet + '66' }}
        thumbColor={isOn ? colors.brandViolet : colors.textDisabled}
      />
    </TouchableOpacity>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  const dotColor =
    title === 'INCOME' ? colors.income :
    title === 'EXPENSE' ? colors.expense : colors.loan;
  return (
    <View style={secStyles.wrap}>
      <View style={[secStyles.dot, { backgroundColor: dotColor }]} />
      <Text style={secStyles.text}>{title}</Text>
    </View>
  );
}

// ─── CategorySection ──────────────────────────────────────────────────────────

function CategorySection({
  title,
  items,
  pinnedNames,
  onToggle,
  onPressRow,
  onDelete,
  isLoan,
}: {
  title: string;
  items: SectionItem[];
  pinnedNames: string[];
  onToggle: (cat: RawCategory) => void;
  onPressRow: (cat: RawCategory) => void;
  onDelete: (cat: RawCategory) => void;
  isLoan: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <View>
      <SectionLabel title={title} />
      <View style={cardStyles.card}>
        {items.map((item, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === items.length - 1;

          if (isDivider(item)) {
            return <View key={item.id} style={cardStyles.divider} />;
          }

          const cat = item as RawCategory;
          const isOn = pinnedNames.includes(cat.name);

          const rowContent = isLoan ? (
            <LoanCategoryRow key={cat.id} category={cat} />
          ) : cat.is_system === 1 ? (
            <SystemCategoryRow
              key={cat.id}
              category={cat}
              isOn={isOn}
              onToggle={() => onToggle(cat)}
              onPress={() => onPressRow(cat)}
            />
          ) : (
            <SwipeableCategoryRow
              key={cat.id}
              category={cat}
              isOn={isOn}
              onToggle={() => onToggle(cat)}
              onPressRow={() => onPressRow(cat)}
              onDelete={() => onDelete(cat)}
            />
          );

          const needsSeparator =
            !isLast &&
            (() => {
              const next = items[idx + 1];
              return !isDivider(next) && !isDivider(item);
            })();

          return (
            <View
              key={cat.id}
              style={[
                cardStyles.rowWrap,
                isFirst && cardStyles.rowWrapFirst,
                isLast && cardStyles.rowWrapLast,
              ]}
            >
              {rowContent}
              {needsSeparator && <View style={cardStyles.rowSeparator} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── CategoryManagementScreen ─────────────────────────────────────────────────

export default function CategoryManagementScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const db = useSQLiteContext();
  const categories = useCategories();
  const pinnedCategoryNames = useSettingsStore((s) => s.pinnedCategoryNames);
  const setPinnedCategoryNames = useSettingsStore((s) => s.setPinnedCategoryNames);

  const [systemInfoCat, setSystemInfoCat] = useState<RawCategory | null>(null);
  const [editSheetCat, setEditSheetCat] = useState<RawCategory | undefined>(undefined);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // ── Derived buckets ───────────────────────────────────────────────────────

  const incomeItems = buildSectionItems(
    categories.filter((c) => c.is_loan_type === 0 && c.flow_type === 'IN'),
    pinnedCategoryNames
  );

  const expenseItems = buildSectionItems(
    categories.filter((c) => c.is_loan_type === 0 && (c.flow_type === 'OUT' || c.flow_type === 'BOTH')),
    pinnedCategoryNames
  );

  const loanItems: SectionItem[] = categories.filter((c) => c.is_loan_type === 1);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    (cat: RawCategory) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const isOn = pinnedCategoryNames.includes(cat.name);
      setPinnedCategoryNames(
        isOn
          ? pinnedCategoryNames.filter((n) => n !== cat.name)
          : [...pinnedCategoryNames, cat.name]
      );
    },
    [pinnedCategoryNames, setPinnedCategoryNames]
  );

  const handlePressRow = useCallback((cat: RawCategory) => {
    if (cat.is_system === 1) {
      setSystemInfoCat(cat);
    } else {
      setEditSheetCat(cat);
    }
  }, []);

  const handleDelete = useCallback(
    (cat: RawCategory) => {
      Alert.alert(
        `Delete ${cat.name}?`,
        'This category will be removed. Existing transactions that used it will keep their data but show the category as unavailable.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteCategory(db, cat.id);
              if (pinnedCategoryNames.includes(cat.name)) {
                setPinnedCategoryNames(pinnedCategoryNames.filter((n) => n !== cat.name));
              }
              useDataRefreshStore.getState().refresh();
            },
          },
        ]
      );
    },
    [db, pinnedCategoryNames, setPinnedCategoryNames]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Custom Header ── */}
      <MotiView
        from={{ opacity: 0, translateY: -6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.headerBack}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity
          onPress={() => setAddSheetOpen(true)}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.headerAdd}
        >
          <Ionicons name="add" size={22} color={colors.brandPurple} />
        </TouchableOpacity>
      </MotiView>

      {/* ── Scrollable Content ── */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 60, damping: 22, stiffness: 280 }}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 110 },
          ]}
        >
          {incomeItems.length > 0 && (
            <CategorySection
              title="INCOME"
              items={incomeItems}
              pinnedNames={pinnedCategoryNames}
              onToggle={handleToggle}
              onPressRow={handlePressRow}
              onDelete={handleDelete}
              isLoan={false}
            />
          )}

          {expenseItems.length > 0 && (
            <CategorySection
              title="EXPENSE"
              items={expenseItems}
              pinnedNames={pinnedCategoryNames}
              onToggle={handleToggle}
              onPressRow={handlePressRow}
              onDelete={handleDelete}
              isLoan={false}
            />
          )}

          {loanItems.length > 0 && (
            <CategorySection
              title="LOANS"
              items={loanItems}
              pinnedNames={pinnedCategoryNames}
              onToggle={handleToggle}
              onPressRow={handlePressRow}
              onDelete={handleDelete}
              isLoan
            />
          )}
        </ScrollView>
      </MotiView>

      {/* ── Modals ── */}
      <SystemInfoSheet
        category={systemInfoCat}
        onClose={() => setSystemInfoCat(null)}
      />

      <AddEditCategorySheet
        visible={editSheetCat !== undefined}
        category={editSheetCat}
        allCategories={categories}
        onClose={() => setEditSheetCat(undefined)}
      />

      <AddEditCategorySheet
        visible={addSheetOpen}
        category={undefined}
        allCategories={categories}
        onClose={() => setAddSheetOpen(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerBack: {
    width: 36,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  headerAdd: {
    width: 36,
    alignItems: 'flex-end',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
});

// Card wrapper for each section
const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  rowWrap: {
    // no extra styling needed — overflow:hidden on card handles rounding
  },
  rowWrapFirst: {},
  rowWrapLast: {},
  rowSeparator: {
    height: 0.5,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 14,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 14,
    marginVertical: 6,
  },
});

// Row styles
const rowStyles = StyleSheet.create({
  swipeWrap: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 52,
    backgroundColor: colors.surfaceCard,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_PANEL_WIDTH,
    backgroundColor: colors.expense,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteActionText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.textInverse,
  },
  rowSlide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    minHeight: 52,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    minHeight: 52,
    backgroundColor: colors.surfaceCard,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  name: {
    flex: 1,
    fontSize: 14,
  },
  switchControl: {
    marginRight: 6,
  },
});

// Section label styles
const secStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

// SystemInfoSheet styles
const sysStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,64,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textDisabled,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  infoBlock: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  infoLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 14,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
  },
});

// AddEditCategorySheet styles
const sheetStyles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: 'rgba(26,16,64,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textDisabled,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 16,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.expense,
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.expense,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dirChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
  },
  dirChipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  toggleMid: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  toggleSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchSelected: {
    borderWidth: 2.5,
    borderColor: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  saveBtn: {
    backgroundColor: colors.brandPurple,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textInverse,
  },
});
