import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  KeyboardAvoidingView,
  Modal,
  NativeModules,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useColors } from '../theme/useColors';
import type { ColorScheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { AnimatedThemeToggle } from '../components/ui/AnimatedThemeToggle';
import { CURRENCY_LIST } from '../utils/currency';
import { useCategoriesMap } from '../hooks/useCategories';
import { useSettingsStore } from '../stores/settingsStore';
import { useAllTransactions } from '../hooks/useTransactions';
import { useSQLiteContext } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  exportTransactionsCSV,
  exportBackupJSON,
  readBackupFile,
  ExportTransaction,
  ExportCategory,
  ExportLoan,
  ExportBudget,
} from '../utils/export';
import { getAllCategories } from '../queries/categories';
import { getAllLoans } from '../queries/loans';
import { useDataRefreshStore } from '../stores/dataRefreshStore';

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

// ─── Back-Tap Slider ──────────────────────────────────────────────────────────

function BackTapSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const colors = useColors();
  const sliderStyles = useMemo(() => createSliderStyles(colors), [colors]);
  const trackWidthRef = useRef(0);
  const startValueRef = useRef(value);
  const valueRef = useRef(value);
  valueRef.current = value;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: () => {
        startValueRef.current = valueRef.current;
      },
      onPanResponderMove: (_, gs) => {
        if (trackWidthRef.current === 0) return;
        const delta = gs.dx / trackWidthRef.current;
        const next = Math.max(0, Math.min(1, startValueRef.current + delta));
        onChange(next);
      },
    })
  ).current;

  const label = value < 0.33 ? 'Low' : value < 0.67 ? 'Medium' : 'High';
  const thumbLeft = `${Math.round(value * 100)}%` as any;

  return (
    <View style={sliderStyles.wrap}>
      <View
        style={sliderStyles.track}
        onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
        {...panResponder.panHandlers}
      >
        <View style={[sliderStyles.fill, { width: thumbLeft }]} />
        <View style={[sliderStyles.thumb, { left: thumbLeft }]} />
      </View>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.labelSide}>Low</Text>
        <Text style={sliderStyles.labelCurrent}>{label}</Text>
        <Text style={sliderStyles.labelSide}>High</Text>
      </View>
    </View>
  );
}

// ─── Back-Tap Test Row ────────────────────────────────────────────────────────

const TAP_THRESHOLD_SETTINGS = 2.4;
const MIN_TAP_INTERVAL_SETTINGS = 280;

function BackTapTestRow({ sensitivity }: { sensitivity: number }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const testRowStyles = useMemo(() => createTestRowStyles(colors), [colors]);
  const [state, setState] = useState<'idle' | 'listening' | 'success'>('idle');
  const [tapCount, setTapCount] = useState(0);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const subscriptionRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  function stopListening() {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    clearTimeout(timeoutRef.current);
  }

  async function startTest() {
    const available = await Accelerometer.isAvailableAsync();
    if (!available) {
      Alert.alert('Not Available', 'Accelerometer is not available on this device.');
      return;
    }
    tapCountRef.current = 0;
    setTapCount(0);
    setState('listening');

    // Adjust threshold based on sensitivity (higher sensitivity = lower threshold)
    const threshold = 3.2 - sensitivity * 2.0;

    Accelerometer.setUpdateInterval(40);
    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      if (mag > threshold) {
        const now = Date.now();
        if (now - lastTapTimeRef.current > MIN_TAP_INTERVAL_SETTINGS) {
          lastTapTimeRef.current = now;
          tapCountRef.current += 1;
          const count = tapCountRef.current;
          setTapCount(count);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (count >= 3) {
            stopListening();
            setState('success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            timeoutRef.current = setTimeout(() => {
              setState('idle');
              setTapCount(0);
              tapCountRef.current = 0;
            }, 2500);
          }
        }
      }
    });

    // Auto-stop after 10 s if no success
    timeoutRef.current = setTimeout(() => {
      stopListening();
      setState('idle');
      setTapCount(0);
      tapCountRef.current = 0;
    }, 10000);
  }

  useEffect(() => () => stopListening(), []);

  return (
    <View style={testRowStyles.row}>
      <View style={[styles.settingsRowIcon]}>
        <Ionicons name="finger-print" size={16} color={colors.brandPurple} />
      </View>
      <View style={styles.settingsRowMid}>
        <Text style={styles.settingsRowLabel}>Test Back Tap</Text>
        {state === 'listening' && (
          <Text style={styles.settingsRowSub}>
            {tapCount === 0 ? 'Tap back of phone 3×…' : `${3 - tapCount} more…`}
          </Text>
        )}
        {state === 'success' && (
          <Text style={[styles.settingsRowSub, { color: colors.income }]}>Detected!</Text>
        )}
      </View>
      {state === 'idle' && (
        <TouchableOpacity style={testRowStyles.testBtn} onPress={startTest} activeOpacity={0.75}>
          <Text style={testRowStyles.testBtnText}>Test</Text>
        </TouchableOpacity>
      )}
      {state === 'listening' && (
        <View style={testRowStyles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[testRowStyles.dot, i < tapCount && testRowStyles.dotFilled]}
            />
          ))}
        </View>
      )}
      {state === 'success' && (
        <View style={testRowStyles.successBadge}>
          <Ionicons name="checkmark" size={14} color={colors.textOnYellow} />
        </View>
      )}
    </View>
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
  const colors = useColors();
  const currStyle = useMemo(() => createCurrStyle(colors), [colors]);
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
      <KeyboardAvoidingView style={currStyle.overlay} behavior="padding">
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Budget Alert Row ─────────────────────────────────────────────────────────

function BudgetAlertRow({
  icon,
  label,
  sublabel,
  switchValue,
  onToggle,
  disabled,
  threshold,
  onThresholdChange,
}: {
  icon: string;
  label: string;
  sublabel: string;
  switchValue: boolean;
  onToggle?: (v: boolean) => void;
  disabled?: boolean;
  threshold?: number;
  onThresholdChange?: (v: number) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const baStyles = useMemo(() => createBaStyles(colors), [colors]);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  function handleBadgePress() {
    setInputVal(String(threshold));
    setEditing(true);
  }

  function handleCommit() {
    const n = parseInt(inputVal, 10);
    if (n >= 1 && n <= 100) onThresholdChange?.(n);
    setEditing(false);
  }

  return (
    <View style={styles.settingsRow}>
      <View style={[styles.settingsRowIcon, disabled && { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons
          name={icon as any}
          size={16}
          color={disabled ? colors.textDisabled : colors.brandPurple}
        />
      </View>
      <View style={styles.settingsRowMid}>
        <View style={baStyles.labelRow}>
          <Text style={[styles.settingsRowLabel, disabled && { color: colors.textMuted }]}>
            {label}
          </Text>
          {threshold !== undefined && (
            editing ? (
              <TextInput
                style={baStyles.threshInput}
                value={inputVal}
                onChangeText={setInputVal}
                keyboardType="number-pad"
                maxLength={3}
                autoFocus
                onBlur={handleCommit}
                onSubmitEditing={handleCommit}
              />
            ) : (
              <TouchableOpacity
                style={baStyles.threshBadge}
                onPress={handleBadgePress}
                activeOpacity={0.75}
              >
                <Text style={baStyles.threshBadgeText}>{threshold}%</Text>
              </TouchableOpacity>
            )
          )}
        </View>
        <Text style={styles.settingsRowSub}>{sublabel}</Text>
      </View>
      {disabled ? (
        <Ionicons name="lock-closed-outline" size={14} color={colors.textDisabled} />
      ) : (
        <Switch
          value={switchValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.surfaceBorder, true: colors.brandViolet + '66' }}
          thumbColor={switchValue ? colors.brandViolet : colors.textDisabled}
        />
      )}
    </View>
  );
}

// ─── Main SettingsScreen ──────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const setCurrency = useSettingsStore((s) => s.setDefaultCurrency);
  const backTapEnabled = useSettingsStore((s) => s.backTapEnabled);
  const setBackTapEnabled = useSettingsStore((s) => s.setBackTapEnabled);
  const sensitivity = useSettingsStore((s) => s.backTapSensitivity);
  const setSensitivity = useSettingsStore((s) => s.setBackTapSensitivity);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const userName = useSettingsStore((s) => s.userName);
  const pinnedCategoryNames = useSettingsStore((s) => s.pinnedCategoryNames);
  const setHasCompletedOnboarding = useSettingsStore((s) => s.setHasCompletedOnboarding);
  const budgetAlerts = useSettingsStore((s) => s.budgetAlerts);
  const setBudgetAlerts = useSettingsStore((s) => s.setBudgetAlerts);

  const refresh = useDataRefreshStore(s => s.refresh);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 500);
  }, [refresh]);

  const allTx = useAllTransactions();
  const catMap = useCategoriesMap();

  const [overlayPermGranted, setOverlayPermGranted] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const check = async () => {
      const granted = await NativeModules.BackTap?.isOverlayPermissionGranted?.();
      setOverlayPermGranted(granted ?? true);
    };
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, []);

  function handleBackTapToggle(enabled: boolean) {
    setBackTapEnabled(enabled);
    if (enabled) {
      NativeModules.BackTap?.start?.();
    } else {
      NativeModules.BackTap?.stop?.();
    }
  }

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);

  function buildExportTxs(): ExportTransaction[] {
    return allTx.map((t) => ({
      id: t.id,
      flow: t.flow,
      amount: t.amount,
      currency: t.currency,
      categoryId: t.category_id,
      categoryName: catMap.get(t.category_id)?.name ?? 'Unknown',
      status: t.status,
      method: t.method,
      note: t.note ?? undefined,
      loan_id: t.loan_id ?? null,
      paid_amount: t.paid_amount,
      khumus_share: t.khumus_share ?? undefined,
      created_at: t.created_at,
    }));
  }

  async function handleExportCSV() {
    if (exportingCSV) return;
    setExportingCSV(true);
    try {
      await exportTransactionsCSV(buildExportTxs());
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export transactions.');
    } finally {
      setExportingCSV(false);
    }
  }

  async function handleBackupJSON() {
    if (backingUp) return;
    setBackingUp(true);
    try {
      const rawCategories = await getAllCategories(db);
      const rawLoans = await getAllLoans(db);
      const rawBudgets = await db.getAllAsync<ExportBudget>(
        'SELECT id, category_id, month, amount_limit, currency FROM budgets'
      );

      const categories: ExportCategory[] = rawCategories.map((c) => ({
        id: c.id,
        name: c.name,
        flow_type: c.flow_type,
        khumus_eligible: c.khumus_eligible,
        is_loan_type: c.is_loan_type,
        color: c.color,
        icon: c.icon,
        is_system: c.is_system,
        sort_order: c.sort_order,
      }));
      const loans: ExportLoan[] = rawLoans.map((l) => ({
        id: l.id,
        type: l.type,
        person_name: l.person_name,
        principal: l.principal,
        currency: l.currency,
        status: l.status,
        created_at: l.created_at,
      }));

      await exportBackupJSON({
        transactions: buildExportTxs(),
        categories,
        loans,
        budgets: rawBudgets,
      });
    } catch {
      Alert.alert('Backup Failed', 'Could not create backup file.');
    } finally {
      setBackingUp(false);
    }
  }

  async function handleImportBackup() {
    if (importingBackup) return;
    setImportingBackup(true);
    try {
      const backup = await readBackupFile();

      let categoriesCreated = 0;
      let loansImported = 0;
      let budgetsImported = 0;
      let txImported = 0;
      let txDuplicates = 0;
      let txSkipped = 0;

      await db.withTransactionAsync(async () => {
        // ── 1. Categories: reuse by id, fall back to name, else create fresh ──
        const existingCats = await db.getAllAsync<{ id: string; name: string }>(
          'SELECT id, name FROM categories'
        );
        const localIdSet = new Set(existingCats.map((c) => c.id));
        const localNameToId = new Map(existingCats.map((c) => [c.name.trim().toLowerCase(), c.id]));
        // Maps a backup category's original id -> the local category id it resolves to.
        const resolvedCategoryId = new Map<string, string>();

        const maxOrderRow = await db.getFirstAsync<{ maxOrder: number }>(
          'SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM categories'
        );
        let nextSortOrder = (maxOrderRow?.maxOrder ?? 0) + 1;

        async function createCategoryRow(
          id: string,
          name: string,
          flow_type: string,
          khumus_eligible: number,
          is_loan_type: number,
          color: string,
          icon: string,
          is_system: number
        ): Promise<void> {
          const now = Date.now();
          await db.runAsync(
            `INSERT OR IGNORE INTO categories
              (id, name, flow_type, khumus_eligible, is_loan_type, color, icon, is_system, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, flow_type, khumus_eligible, is_loan_type, color, icon, is_system, nextSortOrder++, now, now]
          );
          localIdSet.add(id);
          localNameToId.set(name.trim().toLowerCase(), id);
          categoriesCreated++;
        }

        for (const cat of backup.categories) {
          if (localIdSet.has(cat.id)) {
            resolvedCategoryId.set(cat.id, cat.id);
            continue;
          }
          const byName = localNameToId.get(cat.name.trim().toLowerCase());
          if (byName) {
            resolvedCategoryId.set(cat.id, byName);
            continue;
          }
          await createCategoryRow(
            cat.id, cat.name, cat.flow_type, cat.khumus_eligible,
            cat.is_loan_type, cat.color, cat.icon, cat.is_system
          );
          resolvedCategoryId.set(cat.id, cat.id);
        }

        // Resolves a transaction's category, creating a minimal fallback
        // category (legacy v1 backups, or names with no matching id/name
        // locally) rather than dropping the transaction.
        async function resolveTxCategoryId(tx: ExportTransaction): Promise<string> {
          if (tx.categoryId) {
            const mapped = resolvedCategoryId.get(tx.categoryId);
            if (mapped) return mapped;
            if (localIdSet.has(tx.categoryId)) return tx.categoryId;
          }
          const byName = localNameToId.get(tx.categoryName.trim().toLowerCase());
          if (byName) return byName;
          const id = Crypto.randomUUID();
          await createCategoryRow(id, tx.categoryName, tx.flow, 0, 0, '#9B8BC4', 'pricetag-outline', 0);
          return id;
        }

        // ── 2. Loans: preserve original ids so transactions can re-link ──
        const existingLoanIds = new Set(
          (await db.getAllAsync<{ id: string }>('SELECT id FROM loans')).map((l) => l.id)
        );
        for (const loan of backup.loans) {
          const now = Date.now();
          const result = await db.runAsync(
            `INSERT OR IGNORE INTO loans (id, type, person_name, principal, currency, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [loan.id, loan.type, loan.person_name, loan.principal, loan.currency, loan.status, loan.created_at, now]
          );
          if (result.changes > 0) loansImported++;
        }
        const validLoanIds = new Set<string>([...existingLoanIds, ...backup.loans.map((l) => l.id)]);

        // ── 3. Budgets ──
        for (const budget of backup.budgets) {
          const now = Date.now();
          const result = await db.runAsync(
            `INSERT OR IGNORE INTO budgets (id, category_id, month, amount_limit, currency, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [budget.id, budget.category_id, budget.month, budget.amount_limit, budget.currency, now, now]
          );
          if (result.changes > 0) budgetsImported++;
        }

        // ── 4. Transactions (after categories/loans exist to link against) ──
        for (const tx of backup.transactions) {
          let categoryId: string;
          try {
            categoryId = await resolveTxCategoryId(tx);
          } catch {
            txSkipped++;
            continue;
          }
          const loanId = tx.loan_id && validLoanIds.has(tx.loan_id) ? tx.loan_id : null;
          const result = await db.runAsync(
            `INSERT OR IGNORE INTO transactions
              (id, flow, amount, currency, category_id, status, paid_amount, method, note, loan_id, khumus_share, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tx.id, tx.flow, tx.amount, tx.currency, categoryId, tx.status, tx.paid_amount ?? 0, tx.method,
             tx.note ?? null, loanId, tx.khumus_share ?? null, tx.created_at, tx.created_at]
          );
          if (result.changes > 0) txImported++;
          else txDuplicates++;
        }
      });

      useDataRefreshStore.getState().refresh();

      const parts: string[] = [`${txImported} transaction${txImported === 1 ? '' : 's'}`];
      if (categoriesCreated > 0) parts.push(`${categoriesCreated} new categor${categoriesCreated === 1 ? 'y' : 'ies'}`);
      if (loansImported > 0) parts.push(`${loansImported} loan${loansImported === 1 ? '' : 's'}`);
      if (budgetsImported > 0) parts.push(`${budgetsImported} budget${budgetsImported === 1 ? '' : 's'}`);
      const extras: string[] = [];
      if (txDuplicates > 0) extras.push(`${txDuplicates} transactions already existed`);
      if (txSkipped > 0) extras.push(`${txSkipped} transactions skipped`);
      Alert.alert(
        'Import Complete',
        `${parts.join(', ')} imported.` + (extras.length > 0 ? ` ${extras.join(', ')}.` : '')
      );
    } catch (e: any) {
      if (e?.message === 'cancelled') return;
      Alert.alert('Import Failed', 'The file could not be read. Make sure it is a valid Xpense backup.');
    } finally {
      setImportingBackup(false);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandNavy} colors={[colors.brandNavy]} />}
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
              icon="moon-outline"
              label="Appearance"
              right={<AnimatedThemeToggle size="sm" />}
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

        {/* ── Back Tap ── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 80, damping: 22, stiffness: 280 }}
        >
          <SectionHeader title="Back Tap" />
          <View style={styles.card}>
            <SettingsRow
              icon="phone-portrait-outline"
              label="Back Tap"
              sublabel="Triple-tap back of phone to open quick entry"
              right={
                <Switch
                  value={backTapEnabled}
                  onValueChange={handleBackTapToggle}
                  trackColor={{ false: colors.surfaceBorder, true: colors.brandViolet + '66' }}
                  thumbColor={backTapEnabled ? colors.brandViolet : colors.textDisabled}
                />
              }
            />
            {backTapEnabled && (
              <>
                <View style={styles.rowDivider} />
                <View style={styles.sensitivityBlock}>
                  <View style={styles.sensitivityBlockHeader}>
                    <View style={styles.settingsRowIcon}>
                      <Ionicons name="options-outline" size={16} color={colors.brandPurple} />
                    </View>
                    <Text style={[styles.settingsRowLabel, { flex: 1, marginLeft: 12 }]}>
                      Sensitivity
                    </Text>
                  </View>
                  <BackTapSlider value={sensitivity} onChange={setSensitivity} />
                </View>
                <View style={styles.rowDivider} />
                <BackTapTestRow sensitivity={sensitivity} />
                {Platform.OS === 'android' && (
                  <>
                    <View style={styles.rowDivider} />
                    <SettingsRow
                      icon={overlayPermGranted ? 'shield-checkmark-outline' : 'alert-circle-outline'}
                      label="Background Access"
                      sublabel={
                        overlayPermGranted
                          ? 'Overlay permission granted'
                          : 'Required – tap to allow "Display over other apps"'
                      }
                      onPress={overlayPermGranted ? undefined : () => NativeModules.BackTap?.requestOverlayPermission?.()}
                      destructive={!overlayPermGranted}
                    />
                  </>
                )}
              </>
            )}
          </View>
        </MotiView>

        {/* ── Categories ── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 100, damping: 22, stiffness: 280 }}
        >
          <SectionHeader title="Categories" />
          <View style={styles.card}>
            <SettingsRow
              icon="grid-outline"
              label="Categories"
              sublabel={`${pinnedCategoryNames.length} active`}
              onPress={() => navigation.navigate('CategoryManagement')}
            />
          </View>
        </MotiView>

        {/* ── Budget Alerts ── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 120, damping: 22, stiffness: 280 }}
        >
          <SectionHeader title="Budget Alerts" />
          <View style={styles.card}>
            <BudgetAlertRow
              icon="alert-circle-outline"
              label="Early warning"
              sublabel="Alert at threshold % of budget used"
              switchValue={budgetAlerts.threshold1Enabled}
              onToggle={(v) => setBudgetAlerts({ threshold1Enabled: v })}
              threshold={budgetAlerts.threshold1Value}
              onThresholdChange={(v) => setBudgetAlerts({ threshold1Value: v })}
            />
            <View style={styles.rowDivider} />
            <BudgetAlertRow
              icon="warning-outline"
              label="Final warning"
              sublabel="Alert at threshold % of budget used"
              switchValue={budgetAlerts.threshold2Enabled}
              onToggle={(v) => setBudgetAlerts({ threshold2Enabled: v })}
              threshold={budgetAlerts.threshold2Value}
              onThresholdChange={(v) => setBudgetAlerts({ threshold2Value: v })}
            />
            <View style={styles.rowDivider} />
            <BudgetAlertRow
              icon="ban-outline"
              label="Limit exceeded"
              sublabel="Always enabled"
              switchValue={true}
              disabled
            />
            <View style={styles.rowDivider} />
            <BudgetAlertRow
              icon="calendar-outline"
              label="Weekly digest"
              sublabel="Every Monday at 9am"
              switchValue={budgetAlerts.weeklyDigestEnabled}
              onToggle={(v) => setBudgetAlerts({ weeklyDigestEnabled: v })}
            />
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
              sublabel={backingUp ? 'Backing up…' : 'Save a JSON backup to your device'}
              onPress={backingUp ? undefined : handleBackupJSON}
              right={
                backingUp ? (
                  <ActivityIndicator size="small" color={colors.brandPurple} />
                ) : undefined
              }
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="cloud-download-outline"
              label="Restore Backup"
              sublabel={importingBackup ? 'Importing…' : 'Import from a JSON backup file'}
              onPress={importingBackup ? undefined : handleImportBackup}
              right={
                importingBackup ? (
                  <ActivityIndicator size="small" color={colors.brandPurple} />
                ) : undefined
              }
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
            <SettingsRow icon="information-circle-outline" label="Version" sublabel="2.0.0" />
            <View style={styles.rowDivider} />
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowIcon}>
                <Ionicons name="heart-outline" size={16} color={colors.brandPurple} />
              </View>
              <View style={styles.settingsRowMid}>
                <Text style={styles.settingsRowLabel}>Built for {userName || 'You'}</Text>
                <Text style={styles.settingsRowSub}>Xpense — Personal Finance Tracker</Text>
              </View>
            </View>
          </View>
        </MotiView>

        {/* ── Developer ── */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 220, damping: 22, stiffness: 280 }}
        >
          <SectionHeader title="Developer" />
          <View style={styles.card}>
            <SettingsRow
              icon="refresh-outline"
              label="Preview Onboarding"
              sublabel="Re-run the onboarding flow"
              onPress={() =>
                Alert.alert(
                  'Preview Onboarding',
                  'This will restart the onboarding flow. Your data and settings are kept.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Preview', onPress: () => setHasCompletedOnboarding(false) },
                  ]
                )
              }
            />
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: ColorScheme) => StyleSheet.create({
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
    fontSize: 10,
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
    fontSize: 14,
    color: colors.textPrimary,
  },
  settingsRowSub: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  /* Sensitivity slider block */
  sensitivityBlock: {
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 10,
    gap: 10,
  },
  sensitivityBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 14,
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
    fontSize: 10,
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
    fontSize: 14,
    color: colors.brandPurple,
  },
});


// ─── Currency Picker styles ───────────────────────────────────────────────────

const createCurrStyle = (colors: ColorScheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayScrim,
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
    fontSize: 14,
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
    fontSize: 14,
    color: colors.textPrimary,
    width: 44,
  },
  currName: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },
});


// ─── Slider styles ────────────────────────────────────────────────────────────

const createSliderStyles = (colors: ColorScheme) => StyleSheet.create({
  wrap: {
    gap: 6,
    paddingHorizontal: 4,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceElevated,
    position: 'relative',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: colors.brandNavy,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: 2,
    borderColor: colors.brandNavy,
    marginLeft: -10,
    top: -7,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelSide: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  labelCurrent: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.brandNavy,
  },
});

// ─── Budget Alert Row styles ──────────────────────────────────────────────────

const createBaStyles = (colors: ColorScheme) => StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  threshBadge: {
    backgroundColor: colors.brandPale,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.brandPurple + '44',
  },
  threshBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.brandPurple,
  },
  threshInput: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.brandPurple,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
    padding: 0,
  },
});

// ─── Test row styles ──────────────────────────────────────────────────────────

const createTestRowStyles = (colors: ColorScheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    minHeight: 52,
  },
  testBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.brandPale,
    borderWidth: 1,
    borderColor: colors.brandPurple + '44',
  },
  testBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.brandPurple,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.brandPurple,
    borderColor: colors.brandPurple,
  },
  successBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.income,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
