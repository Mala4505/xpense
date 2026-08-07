import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '../../theme/useColors';
import type { ColorScheme } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useOverlayStore } from '../../stores/overlayStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToastStore } from '../../stores/toastStore';
import { useSQLiteContext } from 'expo-sqlite';
import { createTransaction } from '../../queries/transactions';
import { createLoan, findOldestOpenLoan, refreshLoanStatus } from '../../queries/loans';
import { getCategoryById } from '../../queries/categories';
import { formatAmount } from '../../utils/currency';
import { useNotificationsStore } from '../../stores/notificationsStore';
import { useNoteSuggestions } from '../../hooks/useNoteSuggestions';
import { NoteSuggestions } from '../ui/NoteSuggestions';
import { useDataRefreshStore } from '../../stores/dataRefreshStore';
import {
  LOAN_TYPE_BY_CATEGORY,
  LOAN_FLOW_BY_CATEGORY as LOAN_FLOW_MAP,
  LOAN_CREATES_NEW_RECORD,
  LOAN_IS_REPAYMENT,
} from '../../utils/loanCategories';

interface StepNoteProps {
  onClose: () => void;
}

export function StepNote({ onClose }: StepNoteProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    flow,
    amount,
    selectedCategoryId,
    personName,
    note,
    setNote,
    closeOverlay,
    resetOverlay,
  } = useOverlayStore();

  const db = useSQLiteContext();
  const { defaultCurrency, addRecentCategory } = useSettingsStore();
  const { showToast } = useToastStore();
  const inputRef = useRef<TextInput>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const [categoryName, setCategoryName] = useState('');
  const [categoryIsLoan, setCategoryIsLoan] = useState(false);
  const [actualFlow, setActualFlow] = useState<'IN' | 'OUT'>(flow);

  useEffect(() => {
    if (!selectedCategoryId) return;
    getCategoryById(db, selectedCategoryId).then((cat) => {
      if (!cat) return;
      setCategoryName(cat.name);
      setCategoryIsLoan(!!cat.is_loan_type);
      if (cat.is_loan_type) {
        setActualFlow(LOAN_FLOW_MAP[cat.name] ?? flow);
      } else {
        setActualFlow(flow);
      }
    });
  }, [selectedCategoryId, flow, db]);

  const amountColor = actualFlow === 'OUT' ? colors.expense : colors.income;
  const prefix = actualFlow === 'OUT' ? '−' : '+';

  const noteSuggestions = useNoteSuggestions(selectedCategoryId);

  async function handleDone() {
    if (saving || !selectedCategoryId) return;
    setSaving(true);

    try {
      const cat = await getCategoryById(db, selectedCategoryId);
      if (!cat) return;
      const numAmount = parseFloat(amount || '0');

      let loan_id: string | undefined;
      let repaymentAmount: number | undefined;

      if (cat.is_loan_type && personName?.trim()) {
        if (LOAN_CREATES_NEW_RECORD.has(cat.name)) {
          loan_id = await createLoan(db, {
            type: LOAN_TYPE_BY_CATEGORY[cat.name],
            person_name: personName.trim(),
            principal: numAmount,
            currency: defaultCurrency,
          });
        } else if (LOAN_IS_REPAYMENT.has(cat.name)) {
          const openLoan = await findOldestOpenLoan(db, LOAN_TYPE_BY_CATEGORY[cat.name], personName.trim());
          if (openLoan) {
            loan_id = openLoan.id;
            repaymentAmount = numAmount;
          }
        }
      }

      const resolvedFlow: 'IN' | 'OUT' = cat.is_loan_type
        ? (LOAN_FLOW_MAP[cat.name] ?? flow)
        : flow;

      const finalNote = note?.trim() ||
        (personName?.trim() && categoryIsLoan ? personName.trim() : undefined);

      await createTransaction(db, {
        flow: resolvedFlow,
        amount: numAmount,
        currency: defaultCurrency,
        category_id: selectedCategoryId,
        status: 'completed',
        method: 'cash',
        note: finalNote,
        loan_id,
        paid_amount: repaymentAmount,
      });

      if (loan_id && repaymentAmount) {
        await refreshLoanStatus(db, loan_id);
      }

      addRecentCategory(selectedCategoryId);
      useDataRefreshStore.getState().refresh();

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const toastSub = `${prefix} ${defaultCurrency} ${formatAmount(numAmount)} · ${categoryName}`;
      showToast('Transaction added', toastSub);
      useNotificationsStore.getState().addNotification({
        type: 'transaction',
        title: categoryName,
        body: `${prefix} ${defaultCurrency} ${formatAmount(numAmount)}`,
      });

      closeOverlay();
      setTimeout(resetOverlay, 400);
    } catch (err) {
      console.error('Transaction save error:', err);
      showToast('Couldn\'t save', 'Something went wrong. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Read-only top strip */}
      <View style={styles.topStrip}>
        <Text style={[styles.topStripText, { color: amountColor }]}>
          {prefix} {defaultCurrency} {formatAmount(parseFloat(amount || '0'))}
          {categoryName ? <Text style={styles.topStripMuted}> · {categoryName}</Text> : null}
        </Text>
      </View>
      <View style={styles.divider} />

      {/* Note input */}
      <TextInput
        ref={inputRef}
        value={note}
        onChangeText={setNote}
        placeholder="Text"
        placeholderTextColor={colors.textDisabled}
        keyboardType="default"
        multiline
        style={styles.noteInput}
        selectionColor={colors.brandViolet}
      />

      <NoteSuggestions
        suggestions={noteSuggestions}
        currentValue={note ?? ''}
        onSelect={setNote}
      />

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.75}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDone}
          disabled={saving}
          style={styles.doneBtn}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.brandYellow} />
          ) : (
            <Text style={styles.doneText}>Done</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    gap: 16,
  },
  topStrip: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  topStripText: {
    fontFamily: fonts.mono,
    fontSize: 17,
    letterSpacing: -0.4,
  },
  topStripMuted: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 14,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: -20,
  },
  noteInput: {
    minHeight: 64,
    fontFamily: fonts.sans,
    fontSize: 17,
    color: colors.textPrimary,
    lineHeight: 24,
    padding: 0,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.brandPale,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  doneBtn: {
    flex: 1.6,
    height: 44,
    backgroundColor: colors.brandNavy,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.brandYellow,
    letterSpacing: 0.2,
  },
});
