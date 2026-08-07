import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../theme/useColors';
import type { ColorScheme } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useBudgetStore } from '../../stores/budgetStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface BudgetSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  categoryId: string | null;
  categoryName?: string;
  existingBudgetId?: string;
  initialLimit?: number;
}

export function BudgetSetupSheet({
  visible,
  onClose,
  categoryId,
  categoryName,
  existingBudgetId,
  initialLimit,
}: BudgetSetupSheetProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const setBudget = useBudgetStore((s) => s.setBudget);
  const removeBudget = useBudgetStore((s) => s.removeBudget);

  const isEditing = !!existingBudgetId;
  const titleText = isEditing ? 'Edit Limit' : 'Set Budget Limit';
  const subText = categoryId
    ? (categoryName ?? 'Category Budget')
    : 'Overall Monthly Budget';

  useEffect(() => {
    if (visible) {
      setAmount(initialLimit ? String(initialLimit) : '');
    }
  }, [visible, initialLimit]);

  async function handleSave() {
    const num = parseFloat(amount);
    if (!num || num <= 0 || saving) return;
    setSaving(true);
    try {
      await setBudget(categoryId, num);
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save budget limit.');
    } finally {
      setSaving(false);
    }
  }

  function handleRemove() {
    if (!existingBudgetId) return;
    Alert.alert('Remove Limit', 'Remove this budget limit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeBudget(existingBudgetId);
            onClose();
          } catch {
            Alert.alert('Error', 'Could not remove limit.');
          }
        },
      },
    ]);
  }

  const canSave = parseFloat(amount) > 0 && !saving;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior="padding">
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <MotiView
          from={{ translateY: 60, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          style={styles.sheet}
        >
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{titleText}</Text>
              <Text style={styles.subTitle}>{subText}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.amountWrap}>
            <Text style={styles.currLabel}>{currency}</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textDisabled}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.brandYellow} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={handleRemove}
              activeOpacity={0.75}
            >
              <Ionicons name="trash-outline" size={14} color={colors.expense} />
              <Text style={styles.removeBtnText}>Remove limit</Text>
            </TouchableOpacity>
          )}
        </MotiView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
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
    paddingBottom: 40,
    gap: 16,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textDisabled,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  subTitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  currLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 17,
    color: colors.textMuted,
    minWidth: 40,
  },
  amountInput: {
    fontFamily: fonts.mono,
    fontSize: 30,
    flex: 1,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    padding: 0,
    margin: 0,
  },
  saveBtn: {
    backgroundColor: colors.brandNavy,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.brandYellow,
    letterSpacing: 0.2,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  removeBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.expense,
  },
});
