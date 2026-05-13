import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { addDays, subDays } from 'date-fns';
// import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { formatTransactionDate } from '../utils/date';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useAddSheetStore } from '../stores/addSheetStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useToastStore } from '../stores/toastStore';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { formatAmount } from '../utils/currency';
import { createTransaction, updateTransaction } from '../queries/transactions';
import { createLoan } from '../queries/loans';
import { RawCategory, RawTransaction } from '../db/types';
import { Flow, TransactionStatus } from '../types';


const STATUS_OPTIONS: { key: TransactionStatus; label: string }[] = [
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
  { key: 'partial', label: 'Partial' },
  { key: 'cancelled', label: 'Cancelled' },
];

const LOAN_FLOW: Record<string, Flow> = {
  'Loan Given': 'OUT',
  'Loan Received': 'IN',
  'Loan Repaid': 'IN',
  'I Repaid Loan': 'OUT',
};

export function AddSheet() {
  const sheetRef = useRef<BottomSheet>(null);
  const db = useSQLiteContext();
  const { editTransactionId, closeSheet, isOpen } = useAddSheetStore();

  useEffect(() => {
    if (isOpen) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [isOpen]);
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const showToast = useToastStore((s) => s.showToast);

  const amountInputRef = useRef<TextInput>(null);

  const [categories, setCategories] = useState<RawCategory[]>([]);
  const [flow, setFlow] = useState<Flow>('OUT');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('completed');
  const [personName, setPersonName] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );
  const isLoanCategory = (selectedCategory?.is_loan_type ?? 0) === 1;

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.flow_type === flow || c.flow_type === 'BOTH'),
    [categories, flow]
  );

  const numericAmount = parseFloat(amount) || 0;
  const canSave = numericAmount > 0 && !!selectedCategoryId;

  const dateLabel = useMemo(
    () => formatTransactionDate(selectedDate.getTime()),
    [selectedDate]
  );
  const isToday = useMemo(() => {
    const t = new Date();
    return (
      selectedDate.getFullYear() === t.getFullYear() &&
      selectedDate.getMonth()    === t.getMonth()    &&
      selectedDate.getDate()     === t.getDate()
    );
  }, [selectedDate]);

  // Auto-set flow for loan categories
  useEffect(() => {
    if (!selectedCategory || !isLoanCategory) return;
    const locked = LOAN_FLOW[selectedCategory.name];
    if (locked) setFlow(locked);
  }, [selectedCategory, isLoanCategory]);

  // Load categories + prefill when sheet opens
  useEffect(() => {
    if (!isOpen) return;

    db.getAllAsync<RawCategory>('SELECT * FROM categories ORDER BY sort_order ASC').then(
      setCategories
    );

    if (editTransactionId) {
      db.getFirstAsync<RawTransaction>('SELECT * FROM transactions WHERE id = ?', [
        editTransactionId,
      ]).then((tx) => {
        if (!tx) return;
        setFlow(tx.flow);
        setAmount(tx.amount.toString());
        setSelectedCategoryId(tx.category_id);
        setNote(tx.note ?? '');
        setStatus(tx.status);
        setSelectedDate(new Date(tx.created_at));
        if (tx.loan_id) {
          db.getFirstAsync<{ person_name: string }>(
            'SELECT person_name FROM loans WHERE id = ?',
            [tx.loan_id]
          ).then((loan) => {
            if (loan) setPersonName(loan.person_name);
          });
        }
      });
    } else {
      setFlow('OUT');
      setAmount('');
      setSelectedCategoryId(null);
      setNote('');
      setStatus('completed');
      setPersonName('');
      setSelectedDate(new Date());
    }
  }, [isOpen, editTransactionId]);

  function handleFlowChange(newFlow: Flow) {
    if (isLoanCategory) return;
    setFlow(newFlow);
    setSelectedCategoryId(null);
  }

  // function openDatePicker() {
  //   DateTimePickerAndroid.open({
  //     value: selectedDate,
  //     mode: 'date',
  //     maximumDate: new Date(),
  //     onChange: (event, date) => {
  //       if (event.type === 'set' && date) setSelectedDate(date);
  //     },
  //   });
  // }

  function buildTimestamp(date: Date): number {
    const now = new Date();
    const d = new Date(date);
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return d.getTime();
  }

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const prefix = flow === 'IN' ? '+ ' : '− ';
      const amountLabel = `${prefix}${currency} ${formatAmount(numericAmount)}`;

      if (editTransactionId) {
        await updateTransaction(db, editTransactionId, {
          flow,
          amount: numericAmount,
          category_id: selectedCategoryId!,
          note: note.trim() || null,
          status,
          created_at: buildTimestamp(selectedDate),
        });
        showToast('Transaction updated', amountLabel);
      } else {
        let loan_id: string | undefined;
        if (isLoanCategory && personName.trim()) {
          const loanType = flow === 'OUT' ? 'lent' : 'borrowed';
          loan_id = await createLoan(db, {
            type: loanType,
            person_name: personName.trim(),
            principal: numericAmount,
            currency,
          });
        }
        await createTransaction(db, {
          flow,
          amount: numericAmount,
          currency,
          category_id: selectedCategoryId!,
          status,
          method: 'cash',
          note: note.trim() || undefined,
          loan_id,
          created_at: buildTimestamp(selectedDate),
        });
        showToast('Transaction added', amountLabel);
      }
      closeSheet();
    } catch {
      Alert.alert('Error', 'Could not save transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
      enableTouchThrough={false} // 👈 IMPORTANT
    />
  );


  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["58%"]}
      enablePanDownToClose
      onClose={closeSheet}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.surfaceBorder }}
      backgroundStyle={{ backgroundColor: colors.surfaceCard }}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 10 }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sheet title ── */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {editTransactionId ? 'Edit Transaction' : 'Add Transaction'}
          </Text>
          <TouchableOpacity onPress={closeSheet} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Flow toggle ── */}
        <View style={styles.flowToggle}>
          <TouchableOpacity
            style={[
              styles.flowBtn,
              flow === 'OUT' && styles.flowBtnExpenseActive,
              isLoanCategory && styles.flowBtnLocked,
            ]}
            onPress={() => handleFlowChange('OUT')}
            activeOpacity={0.8}
          >
            <Text style={[styles.flowBtnText, flow === 'OUT' && styles.flowBtnTextExpense]}>
              − Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.flowBtn,
              flow === 'IN' && styles.flowBtnIncomeActive,
              isLoanCategory && styles.flowBtnLocked,
            ]}
            onPress={() => handleFlowChange('IN')}
            activeOpacity={0.8}
          >
            <Text style={[styles.flowBtnText, flow === 'IN' && styles.flowBtnTextIncome]}>
              + Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Amount input ── */}
        <TouchableOpacity
          style={styles.amountOuter}
          onPress={() => amountInputRef.current?.focus()}
          activeOpacity={0.9}
        >
          <Text style={styles.toggleSign} onPress={() => handleFlowChange(flow === 'OUT' ? 'IN' : 'OUT')}>
            {flow === 'IN' ? '+' : '−'}
          </Text>
          <TextInput
            ref={amountInputRef}
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textDisabled}
            style={[
              styles.amountInput,
              { color: flow === 'IN' ? colors.income : colors.expense },
            ]}
            textAlign="center"
          />
          <Text style={styles.currencyLabel}>{currency}</Text>
        </TouchableOpacity>

        {/* ── Category grid ── */}
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {filteredCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  isSelected && { backgroundColor: cat.color + '22', borderColor: cat.color },
                ]}
                onPress={() => setSelectedCategoryId(cat.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && { color: cat.color, fontFamily: fonts.sansMedium },
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Person name (loan categories) ── */}
        {isLoanCategory && (
          <View style={styles.inputField}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <TextInput
              style={styles.inputText}
              placeholder="Person's name"
              placeholderTextColor={colors.textDisabled}
              value={personName}
              onChangeText={setPersonName}
              autoCapitalize="words"
            />
          </View>
        )}

        {/* ── Notes ── */}
        <Text style={styles.sectionLabel}>Note</Text>
        <View style={[styles.inputField, { minHeight: 52 }]}>
          <Ionicons name="create-outline" size={14} color={colors.textMuted} />
          <TextInput
            style={[styles.inputText, { flex: 1, textAlignVertical: 'top' }]}
            placeholder="Add a note (optional)"
            placeholderTextColor={colors.textDisabled}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* ── Date ── */}
        <Text style={styles.sectionLabel}>Date</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity
            onPress={() => setSelectedDate(d => subDays(d, 1))}
            style={styles.dateArrow}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text style={styles.dateArrowText}>‹</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity onPress={openDatePicker} style={styles.dateLabelBtn} activeOpacity={0.7}>
            <Text style={styles.dateLabelText}>{dateLabel}</Text>
          </TouchableOpacity> */}
          <TouchableOpacity
            onPress={() => { if (!isToday) setSelectedDate(d => addDays(d, 1)); }}
            style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={isToday ? 1 : 0.7}
            disabled={isToday}
          >
            <Text style={[styles.dateArrowText, isToday && styles.dateArrowTextDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Status ── */}
        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.statusChip, status === s.key && styles.statusChipActive]}
              onPress={() => setStatus(s.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.statusChipText, status === s.key && styles.statusChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.brandYellow} />
          ) : (
            <Text style={styles.saveBtnText}>
              {editTransactionId ? 'Update Transaction' : 'Save Transaction'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  /* Flow toggle */
  flowToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  flowBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  flowBtnExpenseActive: {
    backgroundColor: colors.expenseBg,
  },
  flowBtnIncomeActive: {
    backgroundColor: colors.incomeBg,
  },
  flowBtnLocked: {
    opacity: 0.5,
  },
  flowBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  flowBtnTextExpense: {
    color: colors.expense,
  },
  flowBtnTextIncome: {
    color: colors.income,
  },
  /* Amount */
  amountOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    minHeight: 56,
  },
  toggleSign: {
    fontFamily: fonts.sansBold,
    fontSize: 24,
    color: colors.textMuted,
    width: 24,
    textAlign: 'center',
  },
  amountInput: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 36,
    letterSpacing: -1,
    padding: 0,
    margin: 0,
    textAlign: 'center',
  },
  currencyLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textMuted,
    width: 32,
    textAlign: 'right',
  },
  /* Section label */
  sectionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: -6,
  },
  /* Categories */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceCard,
    minWidth: '45%',
    flex: 1,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryChipText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
  },
  /* Input */
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    padding: 0,
    margin: 0,
  },
  /* Status */
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceCard,
  },
  statusChipActive: {
    backgroundColor: colors.brandNavy,
    borderColor: colors.brandNavy,
  },
  statusChipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  statusChipTextActive: {
    color: colors.textInverse,
  },
  /* Save */
  saveBtn: {
    backgroundColor: colors.brandNavy,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.brandYellow,
    letterSpacing: 0.2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  dateLabelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dateLabelText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.brandViolet,
    textDecorationLine: 'underline',
  },
  dateArrow: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateArrowDisabled: {
    opacity: 0.3,
  },
  dateArrowText: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.brandViolet,
    lineHeight: 26,
  },
  dateArrowTextDisabled: {
    color: colors.textDisabled,
  },
});
