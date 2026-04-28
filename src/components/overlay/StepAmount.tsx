import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { MotiView } from 'moti';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useOverlayStore } from '../../stores/overlayStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface StepAmountProps {
  onClose: () => void;
}

export function StepAmount({ onClose }: StepAmountProps) {
  const { flow, amount, setFlow, setAmount, nextStep } = useOverlayStore();
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const isExpense = flow === 'OUT';
  const amountColor = isExpense ? colors.expense : colors.income;
  const toggleBg = isExpense ? colors.expenseBg : colors.incomeBg;
  const canProceed = amount !== '' && amount !== '0' && parseFloat(amount) > 0;

  function handleAmountChange(text: string) {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    setAmount(cleaned);
  }

  return (
    <View style={styles.container}>
      {/* Flow toggle + amount row */}
      <Pressable
        style={styles.amountOuter}
        onPress={() => inputRef.current?.focus()}
      >
        <MotiView
          animate={{ backgroundColor: toggleBg }}
          transition={{ type: 'timing', duration: 180 }}
          style={styles.toggleButton}
        >
          <TouchableOpacity
            onPress={() => setFlow(flow === 'OUT' ? 'IN' : 'OUT')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.toggleSign, { color: amountColor }]}>
              {isExpense ? '−' : '+'}
            </Text>
          </TouchableOpacity>
        </MotiView>

        <TextInput
          ref={inputRef}
          value={amount}
          onChangeText={handleAmountChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textDisabled}
          style={[styles.amountInput, { color: canProceed ? amountColor : colors.textDisabled }]}
          selectionColor={amountColor}
          textAlign="center"
        />

        <Text style={styles.currencyLabel}>{currency}</Text>
      </Pressable>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.75}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={nextStep}
          disabled={!canProceed}
          style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextText, !canProceed && styles.nextTextDisabled]}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  amountOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    gap: 10,
  },
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleSign: {
    fontFamily: fonts.monoBold,
    fontSize: 22,
    lineHeight: 26,
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
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 0.5,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F0EAF8',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  nextBtn: {
    flex: 1.6,
    height: 44,
    backgroundColor: colors.brandNavy,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: colors.textDisabled,
  },
  nextText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.brandYellow,
    letterSpacing: 0.2,
  },
  nextTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
});
