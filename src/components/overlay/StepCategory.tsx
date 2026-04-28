import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
} from 'react-native';
import { MotiView } from 'moti';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useOverlayStore } from '../../stores/overlayStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSQLiteContext } from 'expo-sqlite';
import { getCategoriesByFlowType } from '../../queries/categories';
import type { RawCategory } from '../../db/types';
import { CategoryIcon } from '../ui/CategoryIcon';
import { formatAmount } from '../../utils/currency';

interface StepCategoryProps {
  onClose: () => void;
}

const LOAN_FLOW_MAP: Record<string, 'IN' | 'OUT'> = {
  'Loan Given':    'OUT',
  'Loan Received': 'IN',
  'Loan Repaid':   'IN',
  'I Repaid Loan': 'OUT',
};

export function StepCategory({ onClose }: StepCategoryProps) {
  const {
    flow,
    amount,
    selectedCategoryId,
    personName,
    setSelectedCategory,
    setPersonName,
    nextStep,
    setFlow,
  } = useOverlayStore();

  const { recentCategories, defaultCurrency } = useSettingsStore();
  const [allCategories, setAllCategories] = useState<RawCategory[]>([]);
  const personInputRef = useRef<TextInput>(null);
  const db = useSQLiteContext();

  useEffect(() => {
    getCategoriesByFlowType(db, flow).then(setAllCategories);
  }, [db, flow]);

  const selectedCategory = allCategories.find((c) => c.id === selectedCategoryId);
  const isLoanSelected = !!selectedCategory?.is_loan_type;
  const isKhumusEligible = !!selectedCategory?.khumus_eligible;
  const khumusShare = isKhumusEligible ? parseFloat(amount || '0') / 5 : 0;

  const recentCats = allCategories.filter((c) => recentCategories.includes(c.id)).slice(0, 3);
  const loanCats = allCategories.filter((c) => c.is_loan_type);
  const regularCats = allCategories.filter((c) => !c.is_loan_type);

  function handleSelectCategory(cat: any) {
    setSelectedCategory(cat.id);

    if (cat.is_loan_type) {
      const lockedFlow = LOAN_FLOW_MAP[cat.name];
      if (lockedFlow) setFlow(lockedFlow);
      setTimeout(() => personInputRef.current?.focus(), 200);
    }
  }

  const canProceed = !!selectedCategoryId && (!isLoanSelected || !!personName?.trim());

  const amountColor = flow === 'OUT' ? colors.expense : colors.income;
  const prefix = flow === 'OUT' ? '−' : '+';

  return (
    <View style={styles.container}>
      {/* Read-only amount strip */}
      <View style={styles.amountStrip}>
        <Text style={[styles.amountStripText, { color: amountColor }]}>
          {prefix} {defaultCurrency} {formatAmount(parseFloat(amount || '0'))}
        </Text>
      </View>
      <View style={styles.divider} />

      {/* Recent chips */}
      {recentCats.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionLabel}>Recent</Text>
          <View style={styles.chipRow}>
            {recentCats.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleSelectCategory(cat)}
                style={[
                  styles.chip,
                  selectedCategoryId === cat.id && styles.chipActive,
                ]}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedCategoryId === cat.id && styles.chipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Category list */}
      <ScrollView
        style={styles.listScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {regularCats.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => handleSelectCategory(cat)}
            style={[
              styles.categoryRow,
              selectedCategoryId === cat.id && styles.categoryRowActive,
            ]}
            activeOpacity={0.7}
          >
            <CategoryIcon name={cat.name} color={cat.color} size={36} />
            <Text style={styles.categoryName}>{cat.name}</Text>
            {selectedCategoryId === cat.id && (
              <View style={styles.checkMark}>
                <Text style={styles.checkMarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Loan categories section */}
        {loanCats.length > 0 && (
          <>
            <View style={styles.loanSeparator}>
              <Text style={styles.loanSeparatorText}>Loan</Text>
            </View>
            {loanCats.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleSelectCategory(cat)}
                style={[
                  styles.categoryRow,
                  selectedCategoryId === cat.id && styles.categoryRowActive,
                ]}
                activeOpacity={0.7}
              >
                <CategoryIcon name={cat.name} color={colors.loan} size={36} />
                <Text style={[styles.categoryName, { color: colors.loan }]}>
                  {cat.name}
                </Text>
                {selectedCategoryId === cat.id && (
                  <View style={[styles.checkMark, { backgroundColor: colors.loanBg }]}>
                    <Text style={[styles.checkMarkText, { color: colors.loan }]}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        <Text style={styles.footerHint}>To add categories, go to Settings</Text>
      </ScrollView>

      {/* Loan direction info strip */}
      {isLoanSelected && (
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.infoStrip}
        >
          <Text style={styles.infoStripText}>
            🔒 Direction set automatically for loans
          </Text>
        </MotiView>
      )}

      {/* Loan person name input */}
      {isLoanSelected && (
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
        >
          <TextInput
            ref={personInputRef}
            value={personName ?? ''}
            onChangeText={setPersonName}
            placeholder="Person's name"
            placeholderTextColor={colors.textDisabled}
            style={styles.personInput}
          />
        </MotiView>
      )}

      {/* Khumus info strip */}
      {isKhumusEligible && khumusShare > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.khumusStrip}
        >
          <Text style={styles.khumusStripText}>
            Khumus share: {defaultCurrency} {formatAmount(khumusShare)} will be added automatically
          </Text>
        </MotiView>
      )}

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
    gap: 12,
  },
  amountStrip: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  amountStripText: {
    fontFamily: fonts.mono,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: -20,
  },
  recentSection: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: colors.brandPale,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    color: colors.brandYellow,
  },
  listScroll: {
    maxHeight: 220,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  categoryRowActive: {
    backgroundColor: colors.surfaceElevated,
  },
  categoryName: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  checkMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.incomeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMarkText: {
    fontSize: 11,
    color: colors.income,
    fontFamily: fonts.sansBold,
  },
  loanSeparator: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  loanSeparatorText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.loan,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  footerHint: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: 10,
  },
  infoStrip: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoStripText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.pending,
  },
  personInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceBg,
  },
  khumusStrip: {
    backgroundColor: colors.khumusBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  khumusStripText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.khumus,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
