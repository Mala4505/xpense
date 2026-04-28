import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { CURRENCY_LIST } from '../utils/currency';
import { useCategories, useCategoriesMap, RawCategory } from '../hooks/useCategories';
import { useSettingsStore, BackTapSensitivity } from '../stores/settingsStore';
import { useAllTransactions } from '../hooks/useTransactions';
import { useSQLiteContext } from 'expo-sqlite';
import { createCategory, updateCategory, deleteCategory } from '../queries/categories';
import { exportTransactionsCSV, ExportTransaction } from '../utils/export';
import { FlowType } from '../types';

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  sublabel,
  right,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.settingsRowIcon, destructive && { backgroundColor: colors.expenseBg }]}>
        <Ionicons
          name={icon as any}
          size={16}
          color={destructive ? colors.expense : colors.brandPurple}
        />
      </View>
      <View style={styles.settingsRowMid}>
        <Text style={[styles.settingsRowLabel, destructive && { color: colors.expense }]}>
          {label}
        </Text>
        {sublabel ? <Text style={styles.settingsRowSub}>{sublabel}</Text> : null}
      </View>
      {right ?? (
        onPress ? <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} /> : null
      )}
    </TouchableOpacity>
  );
}

// ─── Add Category Modal ───────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#22C87A', '#4ADE80', '#A78BFA', '#38BDF8', '#FB923C',
  '#FBBF24', '#F87171', '#F472B6', '#34D399', '#60A5FA',
  '#E05C5C', '#9B6EF0', '#C48A00', '#F0B429', '#94A3B8',
];

function AddCategoryModal({
  visible,
  onClose,
  onCreated,
  editCategory,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  editCategory?: RawCategory;
}) {
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [flowType, setFlowType] = useState<FlowType>('OUT');
  const [khumusEligible, setKhumusEligible] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editCategory) {
        setName(editCategory.name);
        setFlowType(editCategory.flow_type);
        setKhumusEligible(!!editCategory.khumus_eligible);
        setSelectedColor(editCategory.color);
      } else {
        setName('');
        setFlowType('OUT');
        setKhumusEligible(false);
        setSelectedColor(PRESET_COLORS[0]);
      }
    }
  }, [visible, editCategory]);

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (editCategory) {
        await updateCategory(db, editCategory.id, {
          name: name.trim(),
          flow_type: flowType,
          khumus_eligible: khumusEligible && flowType !== 'OUT',
          color: selectedColor,
          icon: editCategory.icon,
        });
      } else {
        await createCategory(db, {
          name: name.trim(),
          flow_type: flowType,
          khumus_eligible: khumusEligible && flowType !== 'OUT',
          color: selectedColor,
          icon: 'circle',
        });
      }
      onCreated();
      onClose();
    } catch {
      Alert.alert('Error', editCategory ? 'Could not update category.' : 'Could not create category.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={addCatStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <MotiView
          from={{ translateY: 60, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          exit={{ translateY: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          style={addCatStyles.sheet}
        >
          <View style={addCatStyles.handle} />
          <Text style={addCatStyles.title}>{editCategory ? 'Edit Category' : 'New Category'}</Text>

          <Text style={addCatStyles.fieldLabel}>Name</Text>
          <TextInput
            style={addCatStyles.input}
            placeholder="Category name"
            placeholderTextColor={colors.textDisabled}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoFocus
          />

          <Text style={addCatStyles.fieldLabel}>Direction</Text>
          <View style={addCatStyles.dirRow}>
            {(['IN', 'OUT', 'BOTH'] as FlowType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[addCatStyles.dirChip, flowType === f && addCatStyles.dirChipActive]}
                onPress={() => setFlowType(f)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    addCatStyles.dirChipText,
                    flowType === f && addCatStyles.dirChipTextActive,
                  ]}
                >
                  {f === 'IN' ? 'Income' : f === 'OUT' ? 'Expense' : 'Both'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {flowType !== 'OUT' && (
            <View style={addCatStyles.toggleRow}>
              <Text style={addCatStyles.toggleLabel}>Khumus eligible</Text>
              <Switch
                value={khumusEligible}
                onValueChange={setKhumusEligible}
                trackColor={{ false: colors.surfaceBorder, true: colors.khumus + '66' }}
                thumbColor={khumusEligible ? colors.khumus : colors.textDisabled}
              />
            </View>
          )}

          <Text style={addCatStyles.fieldLabel}>Color</Text>
          <View style={addCatStyles.colorGrid}>
            {PRESET_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  addCatStyles.colorSwatch,
                  { backgroundColor: c },
                  selectedColor === c && addCatStyles.colorSwatchSelected,
                ]}
                onPress={() => setSelectedColor(c)}
              >
                {selectedColor === c && (
                  <Ionicons name="checkmark" size={12} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[addCatStyles.createBtn, (!name.trim() || saving) && addCatStyles.createBtnDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.brandYellow} />
            ) : (
              <Text style={addCatStyles.createBtnText}>
                {editCategory ? 'Save Changes' : 'Create Category'}
              </Text>
            )}
          </TouchableOpacity>
        </MotiView>
      </View>
    </Modal>
  );
}

// ─── Category chip (grid item) ───────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;

function CategoryChip({
  category,
  onPress,
  onLongPress,
}: {
  category: RawCategory;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={catGridStyles.chip}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <View style={[catGridStyles.chipCircle, { backgroundColor: category.color }]}>
        <Text style={catGridStyles.chipInitial}>
          {category.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={catGridStyles.chipLabel} numberOfLines={1}>{category.name}</Text>
    </TouchableOpacity>
  );
}

// ─── Currency Picker Modal ────────────────────────────────────────────────────

function CurrencyPickerModal({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = CURRENCY_LIST.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(code: string) {
    if (code !== current) {
      Alert.alert(
        'Change Currency',
        `This will only affect new transactions. All existing records keep their original currency (${current}).`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Change', onPress: () => { onSelect(code); onClose(); } },
        ]
      );
    } else {
      onClose();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={currStyle.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={currStyle.sheet}>
          <View style={currStyle.handle} />
          <Text style={currStyle.title}>Select Currency</Text>
          <View style={currStyle.searchWrap}>
            <Ionicons name="search-outline" size={15} color={colors.textMuted} />
            <TextInput
              style={currStyle.searchInput}
              placeholder="Search currencies..."
              placeholderTextColor={colors.textDisabled}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {filtered.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[currStyle.currRow, c.code === current && currStyle.currRowActive]}
                onPress={() => handleSelect(c.code)}
                activeOpacity={0.7}
              >
                <Text style={currStyle.currCode}>{c.code}</Text>
                <Text style={currStyle.currName}>{c.name}</Text>
                {c.code === current && (
                  <Ionicons name="checkmark" size={16} color={colors.brandPurple} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main SettingsScreen ──────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const setCurrency = useSettingsStore((s) => s.setDefaultCurrency);
  const sensitivity = useSettingsStore((s) => s.backTapSensitivity);
  const setSensitivity = useSettingsStore((s) => s.setBackTapSensitivity);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);

  const categories = useCategories();
  const allTx = useAllTransactions();
  const catMap = useCategoriesMap();

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RawCategory | null>(null);
  const [catTab, setCatTab] = useState<'All' | 'IN' | 'OUT' | 'BOTH'>('All');
  const [exportingCSV, setExportingCSV] = useState(false);

  const displayedCategories = useMemo(() =>
    categories.filter((c) => catTab === 'All' ? true : c.flow_type === catTab),
    [categories, catTab]
  );

  const SENSITIVITY_OPTIONS: { key: BackTapSensitivity; label: string }[] = [
    { key: 'low', label: 'Low' },
    { key: 'medium', label: 'Medium' },
    { key: 'high', label: 'High' },
  ];

  async function handleDeleteCategory(cat: RawCategory) {
    if (cat.is_system) {
      Alert.alert('Cannot Delete', 'System categories cannot be deleted.');
      return;
    }
    Alert.alert(
      'Delete Category',
      `Delete "${cat.name}"? Existing transactions with this category will remain.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(db, cat.id);
            } catch {
              Alert.alert('Error', 'Could not delete category.');
            }
          },
        },
      ]
    );
  }

  async function handleExportCSV() {
    if (exportingCSV) return;
    setExportingCSV(true);
    try {
      const exportTxs: ExportTransaction[] = allTx.map((t) => ({
        id: t.id,
        flow: t.flow,
        amount: t.amount,
        currency: t.currency,
        categoryName: catMap.get(t.category_id)?.name ?? 'Unknown',
        status: t.status,
        method: t.method,
        note: t.note ?? undefined,
        khumus_share: t.khumus_share ?? undefined,
        created_at: t.created_at,
      }));
      await exportTransactionsCSV(exportTxs);
    } catch {
      Alert.alert('Export Failed', 'Could not export transactions.');
    } finally {
      setExportingCSV(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Settings</Text>
      </MotiView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
      >
        {/* ── Preferences ── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 60, damping: 22, stiffness: 280 }}
        >
          <SectionHeader title="Preferences" />
          <View style={styles.card}>
            <SettingsRow
              icon="cash-outline"
              label="Default Currency"
              sublabel={currency}
              onPress={() => setShowCurrencyPicker(true)}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="phone-portrait-outline"
              label="Back-Tap Sensitivity"
              right={
                <View style={styles.sensitivityRow}>
                  {SENSITIVITY_OPTIONS.map((o) => (
                    <TouchableOpacity
                      key={o.key}
                      style={[
                        styles.sensitivityChip,
                        sensitivity === o.key && styles.sensitivityChipActive,
                      ]}
                      onPress={() => setSensitivity(o.key)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.sensitivityChipText,
                          sensitivity === o.key && styles.sensitivityChipTextActive,
                        ]}
                      >
                        {o.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              }
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="notifications-outline"
              label="Monthly Notifications"
              right={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: colors.surfaceBorder, true: colors.brandViolet + '66' }}
                  thumbColor={notificationsEnabled ? colors.brandViolet : colors.textDisabled}
                />
              }
            />
          </View>
        </MotiView>

        {/* ── Categories ── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 100, damping: 22, stiffness: 280 }}
        >
          <SectionHeader title="Categories" />

          {/* Tab filter row */}
          <View style={catGridStyles.tabRow}>
            {(['All', 'IN', 'OUT', 'BOTH'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[catGridStyles.tab, catTab === t && catGridStyles.tabActive]}
                onPress={() => setCatTab(t)}
                activeOpacity={0.75}
              >
                <Text style={[catGridStyles.tabText, catTab === t && catGridStyles.tabTextActive]}>
                  {t === 'IN' ? 'Income' : t === 'OUT' ? 'Expense' : t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category grid */}
          <View style={catGridStyles.grid}>
            {displayedCategories.map((cat) => (
              <CategoryChip
                key={cat.id}
                category={cat}
                onPress={() => setEditingCategory(cat)}
                onLongPress={() => handleDeleteCategory(cat)}
              />
            ))}
            <TouchableOpacity
              style={catGridStyles.chip}
              onPress={() => setShowAddCategory(true)}
              activeOpacity={0.75}
            >
              <View style={catGridStyles.addChipCircle}>
                <Ionicons name="add" size={22} color={colors.brandPurple} />
              </View>
              <Text style={catGridStyles.chipLabel}>Add</Text>
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* ── Data ── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 140, damping: 22, stiffness: 280 }}
        >
          <SectionHeader title="Data" />
          <View style={styles.card}>
            <SettingsRow
              icon="download-outline"
              label="Export CSV"
              sublabel={exportingCSV ? 'Exporting…' : `${allTx.length} transactions`}
              onPress={exportingCSV ? undefined : handleExportCSV}
              right={
                exportingCSV ? (
                  <ActivityIndicator size="small" color={colors.brandPurple} />
                ) : undefined
              }
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="cloud-upload-outline"
              label="Backup Data"
              sublabel="Save a JSON backup to your device"
              onPress={() => Alert.alert('Backup', 'Backup feature uses the Export Report function from the Reports screen.')}
            />
          </View>
        </MotiView>

        {/* ── About ── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 180, damping: 22, stiffness: 280 }}
        >
          <SectionHeader title="About" />
          <View style={styles.card}>
            <SettingsRow icon="information-circle-outline" label="Version" sublabel="1.0.0" />
            <View style={styles.rowDivider} />
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowIcon}>
                <Ionicons name="heart-outline" size={16} color={colors.brandPurple} />
              </View>
              <View style={styles.settingsRowMid}>
                <Text style={styles.settingsRowLabel}>Built for Aliasger</Text>
                <Text style={styles.settingsRowSub}>Xpense — Personal Finance Tracker</Text>
              </View>
            </View>
          </View>
        </MotiView>
      </ScrollView>

      {/* Modals */}
      <CurrencyPickerModal
        visible={showCurrencyPicker}
        current={currency}
        onSelect={setCurrency}
        onClose={() => setShowCurrencyPicker(false)}
      />
      <AddCategoryModal
        visible={showAddCategory || editingCategory !== null}
        editCategory={editingCategory ?? undefined}
        onClose={() => { setShowAddCategory(false); setEditingCategory(null); }}
        onCreated={() => {}}
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
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  sectionHeader: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  swipeHint: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textDisabled,
    marginBottom: 6,
    paddingLeft: 2,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  rowDivider: {
    height: 0.5,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 14,
  },
  /* Settings row */
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    minHeight: 52,
  },
  settingsRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.brandPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsRowMid: {
    flex: 1,
    gap: 2,
  },
  settingsRowLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  settingsRowSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
  },
  /* Sensitivity chips */
  sensitivityRow: {
    flexDirection: 'row',
    gap: 4,
  },
  sensitivityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  sensitivityChipActive: {
    backgroundColor: colors.brandNavy,
  },
  sensitivityChipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.textMuted,
  },
  sensitivityChipTextActive: {
    color: colors.textInverse,
  },
  /* Swipeable category row */
  swipeWrap: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 54,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 76,
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
    color: 'white',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.surfaceCard,
  },
  catRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catRowDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  catRowMid: {
    flex: 1,
    gap: 2,
  },
  catRowName: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  catRowMeta: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  systemBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
  },
  systemBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 9,
    color: colors.textDisabled,
    letterSpacing: 0.2,
  },
  /* Add category button */
  addCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 4,
    justifyContent: 'center',
    marginTop: 6,
  },
  addCatBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.brandPurple,
  },
});

// ─── Add Category Modal styles ────────────────────────────────────────────────

const addCatStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,64,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textDisabled,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: -6,
  },
  dirRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -6,
  },
  dirChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  dirChipActive: {
    backgroundColor: colors.brandNavy,
    borderColor: colors.brandNavy,
  },
  dirChipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  dirChipTextActive: {
    color: colors.textInverse,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  toggleLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -6,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createBtn: {
    backgroundColor: colors.brandNavy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  createBtnDisabled: {
    opacity: 0.45,
  },
  createBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.brandYellow,
  },
});

// ─── Currency Picker styles ───────────────────────────────────────────────────

const currStyle = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,64,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textDisabled,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  currRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    borderRadius: 10,
    marginBottom: 2,
  },
  currRowActive: {
    backgroundColor: colors.brandPale,
  },
  currCode: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.textPrimary,
    width: 44,
  },
  currName: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
});

// ─── Category grid styles ─────────────────────────────────────────────────────

const catGridStyles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  tabActive: {
    backgroundColor: colors.brandNavy,
    borderColor: colors.brandNavy,
  },
  tabText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textInverse,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  chip: {
    width: (SCREEN_WIDTH - 48) / 3,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  chipCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipInitial: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: 'white',
  },
  chipLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  addChipCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brandPale,
    borderWidth: 1.5,
    borderColor: colors.brandPurple,
    borderStyle: 'dashed',
  },
});
