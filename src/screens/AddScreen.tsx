// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import {
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
//   ActivityIndicator,
// } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useNavigation } from '@react-navigation/native';
// import { MotiView, AnimatePresence } from 'moti';
// import { Ionicons } from '@expo/vector-icons';
// import * as Haptics from 'expo-haptics';
// import { format, addDays, subDays } from 'date-fns';
// import { colors } from '../theme/colors';
// import { fonts } from '../theme/fonts';
// import { formatAmount } from '../utils/currency';
// import { useCategories } from '../hooks/useCategories';
// import { useSettingsStore } from '../stores/settingsStore';
// import { useToastStore } from '../stores/toastStore';
// import { useSQLiteContext } from 'expo-sqlite';
// import { createTransaction } from '../queries/transactions';
// import { createLoan } from '../queries/loans';
// import { Flow, PaymentMethod, TransactionStatus } from '../types';

// // ─── Types ────────────────────────────────────────────────────────────────────

// type CalcOp = '+' | '−' | '×' | null;

// const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
//   { key: 'cash', label: 'Cash', icon: 'cash-outline' },
//   { key: 'card', label: 'Card', icon: 'card-outline' },
//   { key: 'gpay', label: 'GPay', icon: 'phone-portrait-outline' },
//   { key: 'bank', label: 'Bank', icon: 'business-outline' },
//   { key: 'cheque', label: 'Cheque', icon: 'document-text-outline' },
//   { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
// ];

// const STATUS_OPTIONS: { key: TransactionStatus; label: string }[] = [
//   { key: 'completed', label: 'Completed' },
//   { key: 'pending', label: 'Pending' },
//   { key: 'partial', label: 'Partial' },
//   { key: 'cancelled', label: 'Cancelled' },
// ];

// // ─── Small helper components ──────────────────────────────────────────────────

// function SectionLabel({ title }: { title: string }) {
//   return <Text style={sectionStyle}>{title}</Text>;
// }

// const sectionStyle: object = {
//   fontFamily: fonts.sansMedium,
//   fontSize: 11,
//   color: colors.textMuted,
//   letterSpacing: 0.5,
//   textTransform: 'uppercase' as const,
//   marginBottom: 6,
// };

// // ─── Main Screen ──────────────────────────────────────────────────────────────

// export default function AddScreen() {
//   const insets = useSafeAreaInsets();
//   const db = useSQLiteContext();
//   const navigation = useNavigation();
//   const currency = useSettingsStore((s) => s.defaultCurrency);
//   const addRecentCategory = useSettingsStore((s) => s.addRecentCategory);
//   const showToast = useToastStore((s) => s.showToast);

//   const categories = useCategories();

//   // ── Form state ────────────────────────────────────────────────────────────
//   const [flow, setFlow] = useState<Flow>('OUT');
//   const [amount, setAmount] = useState('');
//   const [calcBuffer, setCalcBuffer] = useState('');
//   const [calcOp, setCalcOp] = useState<CalcOp>(null);

//   const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
//   const [personName, setPersonName] = useState('');

//   const [selectedDate, setSelectedDate] = useState(new Date());
//   const [status, setStatus] = useState<TransactionStatus>('completed');
//   const [paidAmount, setPaidAmount] = useState('');
//   const [method, setMethod] = useState<PaymentMethod>('cash');
//   const [note, setNote] = useState('');

//   const [saving, setSaving] = useState(false);

//   const amountRef = useRef<TextInput>(null);

//   // ── Derived values ────────────────────────────────────────────────────────

//   const numericAmount = useMemo(() => parseFloat(amount) || 0, [amount]);

//   const filteredCategories = useMemo(() => {
//     return categories.filter(
//       (c) => c.flow_type === flow || c.flow_type === 'BOTH'
//     );
//   }, [categories, flow]);

//   const selectedCategory = useMemo(
//     () => (selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : null),
//     [categories, selectedCategoryId]
//   );

//   const isLoanCategory = selectedCategory?.is_loan_type ?? false;
//   const isKhumusEligible = selectedCategory?.khumus_eligible ?? false;
//   const khumusShare = isKhumusEligible && !isLoanCategory ? numericAmount / 5 : 0;

//   const canSave = numericAmount > 0 && !!selectedCategoryId;

//   // Lock flow when loan category selected
//   useEffect(() => {
//     if (!selectedCategory?.is_loan_type) return;
//     const LOAN_FLOW: Record<string, Flow> = {
//       'Loan Given': 'OUT',
//       'Loan Received': 'IN',
//       'Loan Repaid': 'IN',
//       'I Repaid Loan': 'OUT',
//     };
//     const locked = LOAN_FLOW[selectedCategory.name];
//     if (locked) setFlow(locked);
//   }, [selectedCategory]);

//   // Reset category when flow changes
//   function handleFlowChange(newFlow: Flow) {
//     if (isLoanCategory) return; // can't change flow if loan category is selected
//     setFlow(newFlow);
//     setSelectedCategoryId(null);
//   }

//   // ── Calculator ────────────────────────────────────────────────────────────

//   function applyCalcOp(op: CalcOp) {
//     const base = parseFloat(amount) || 0;
//     const buf = parseFloat(calcBuffer) || 0;

//     if (calcBuffer && calcOp) {
//       let result = base;
//       if (calcOp === '+') result = base + buf;
//       else if (calcOp === '−') result = base - buf;
//       else if (calcOp === '×') result = base * buf;
//       const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(2);
//       setAmount(formatted);
//       setCalcBuffer('');
//     }
//     setCalcOp(op);
//   }

//   function handleCalcEquals() {
//     if (!calcBuffer || !calcOp) return;
//     const base = parseFloat(amount) || 0;
//     const buf = parseFloat(calcBuffer) || 0;
//     let result = base;
//     if (calcOp === '+') result = base + buf;
//     else if (calcOp === '−') result = base - buf;
//     else if (calcOp === '×') result = base * buf;
//     const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(2);
//     setAmount(formatted);
//     setCalcBuffer('');
//     setCalcOp(null);
//   }

//   // ── Save ──────────────────────────────────────────────────────────────────

//   async function handleSave() {
//     if (!canSave || saving) return;

//     setSaving(true);
//     try {
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

//       let loan_id: string | undefined;
//       if (isLoanCategory && personName.trim()) {
//         const loanType = flow === 'OUT' ? 'lent' : 'borrowed';
//         loan_id = await createLoan(db, {
//           type: loanType,
//           person_name: personName.trim(),
//           principal: numericAmount,
//           currency,
//         });
//       }

//       await createTransaction(db, {
//         flow,
//         amount: numericAmount,
//         currency,
//         category_id: selectedCategoryId!,
//         status,
//         method,
//         note: note.trim() || undefined,
//         loan_id,
//         paid_amount: status === 'partial' ? (parseFloat(paidAmount) || 0) : undefined,
//         created_at: selectedDate.getTime(),
//       });

//       addRecentCategory(selectedCategoryId!);

//       const catName = selectedCategory?.name ?? '';
//       const prefix = flow === 'IN' ? '+ ' : '− ';
//       showToast(
//         'Transaction added',
//         `${prefix}${currency} ${formatAmount(numericAmount)} · ${catName}`
//       );

//       navigation.goBack();
//     } catch (err) {
//       Alert.alert('Error', 'Could not save transaction. Please try again.');
//     } finally {
//       setSaving(false);
//     }
//   }

//   // ── Date helpers ──────────────────────────────────────────────────────────

//   const dateLabel = useMemo(() => {
//     const today = new Date();
//     const yesterday = subDays(today, 1);
//     if (format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
//       return `Today, ${format(selectedDate, 'h:mm a')}`;
//     }
//     if (format(selectedDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
//       return `Yesterday, ${format(selectedDate, 'h:mm a')}`;
//     }
//     return format(selectedDate, 'dd MMM yyyy, h:mm a');
//   }, [selectedDate]);

//   function shiftDay(delta: number) {
//     setSelectedDate((d) => (delta > 0 ? addDays(d, 1) : subDays(d, 1)));
//   }

//   function shiftHour(delta: number) {
//     setSelectedDate((d) => new Date(d.getTime() + delta * 3_600_000));
//   }

//   // ─────────────────────────────────────────────────────────────────────────

//   return (
//     <View style={[styles.container, { paddingBottom: insets.bottom }]}>
//       {/* Header */}
//       <MotiView
//         from={{ opacity: 0, translateY: -8 }}
//         animate={{ opacity: 1, translateY: 0 }}
//         transition={{ type: 'spring', damping: 22, stiffness: 300 }}
//         style={[styles.header, { paddingTop: insets.top + 12 }]}
//       >
//         <View style={{ width: 28 }} />
//         <Text style={styles.headerTitle}>Add Transaction</Text>
//         <TouchableOpacity
//           onPress={() => navigation.goBack()}
//           hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//         >
//           <Ionicons name="close" size={22} color={colors.textMuted} />
//         </TouchableOpacity>
//       </MotiView>

//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         keyboardVerticalOffset={0}
//       >
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={styles.scroll}
//           keyboardShouldPersistTaps="handled"
//         >
//           {/* ── Direction Toggle ── */}
//           <MotiView
//             from={{ opacity: 0, translateY: 10 }}
//             animate={{ opacity: 1, translateY: 0 }}
//             transition={{ type: 'spring', delay: 40, damping: 22, stiffness: 280 }}
//           >
//             <View style={styles.directionToggle}>
//               <TouchableOpacity
//                 style={[
//                   styles.dirBtn,
//                   flow === 'OUT' && styles.dirBtnExpenseActive,
//                   !!isLoanCategory && styles.dirBtnLocked,
//                 ]}
//                 onPress={() => handleFlowChange('OUT')}
//                 activeOpacity={0.8}
//               >
//                 <Text
//                   style={[
//                     styles.dirBtnText,
//                     flow === 'OUT' && styles.dirBtnTextExpense,
//                   ]}
//                 >
//                   − Expense
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[
//                   styles.dirBtn,
//                   flow === 'IN' && styles.dirBtnIncomeActive,
//                   !!isLoanCategory && styles.dirBtnLocked,
//                 ]}
//                 onPress={() => handleFlowChange('IN')}
//                 activeOpacity={0.8}
//               >
//                 <Text
//                   style={[
//                     styles.dirBtnText,
//                     flow === 'IN' && styles.dirBtnTextIncome,
//                   ]}
//                 >
//                   + Income
//                 </Text>
//               </TouchableOpacity>
//             </View>
//             {isLoanCategory && (
//               <View style={styles.loanLockStrip}>
//                 <Ionicons name="lock-closed-outline" size={11} color={colors.pending} />
//                 <Text style={styles.loanLockText}>Direction set automatically for loans</Text>
//               </View>
//             )}
//           </MotiView>

//           {/* ── Amount Field ── */}
//           <MotiView
//             from={{ opacity: 0, translateY: 10 }}
//             animate={{ opacity: 1, translateY: 0 }}
//             transition={{ type: 'spring', delay: 70, damping: 22, stiffness: 280 }}
//             style={styles.amountSection}
//           >
//             <TouchableOpacity
//               style={styles.amountRow}
//               onPress={() => amountRef.current?.focus()}
//               activeOpacity={0.9}
//             >
//               <Text style={styles.currencyLabel}>{currency}</Text>
//               <TextInput
//                 ref={amountRef}
//                 style={[
//                   styles.amountInput,
//                   { color: flow === 'IN' ? colors.income : colors.expense },
//                 ]}
//                 value={calcBuffer || amount}
//                 onChangeText={(v) => {
//                   const clean = v.replace(/[^0-9.]/g, '');
//                   if (calcOp) {
//                     setCalcBuffer(clean);
//                   } else {
//                     setAmount(clean);
//                   }
//                 }}
//                 keyboardType="decimal-pad"
//                 placeholder="0"
//                 placeholderTextColor={colors.textDisabled}
//                 autoFocus
//               />
//             </TouchableOpacity>

//             {/* Calc op indicator */}
//             {calcOp && (
//               <View style={styles.calcOpRow}>
//                 <Text style={styles.calcOpText}>
//                   {formatAmount(parseFloat(amount) || 0)} {calcOp}
//                   {calcBuffer ? ` ${calcBuffer}` : ''}
//                 </Text>
//               </View>
//             )}

//             {/* Khumus info strip */}
//             {isKhumusEligible && numericAmount > 0 && (
//               <AnimatePresence>
//                 <MotiView
//                   key="khumus-strip"
//                   from={{ opacity: 0, height: 0 }}
//                   animate={{ opacity: 1, height: 30 }}
//                   exit={{ opacity: 0, height: 0 }}
//                   transition={{ type: 'timing', duration: 180 }}
//                   style={styles.khumusStrip}
//                 >
//                   <Ionicons name="star-outline" size={11} color={colors.khumus} />
//                   <Text style={styles.khumusStripText}>
//                     Khumus share:{' '}
//                     <Text style={styles.khumusStripBold}>
//                       {currency} {formatAmount(khumusShare)}
//                     </Text>{' '}
//                     will be added automatically
//                   </Text>
//                 </MotiView>
//               </AnimatePresence>
//             )}

//             {/* Inline calculator */}
//             <View style={styles.calcRow}>
//               {(['+'as CalcOp, '−' as CalcOp, '×' as CalcOp] as CalcOp[]).map((op) => (
//                 <TouchableOpacity
//                   key={op!}
//                   style={[styles.calcBtn, calcOp === op && styles.calcBtnActive]}
//                   onPress={() => applyCalcOp(op)}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={[styles.calcBtnText, calcOp === op && styles.calcBtnTextActive]}>
//                     {op}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//               <TouchableOpacity
//                 style={[styles.calcBtn, styles.calcBtnEquals]}
//                 onPress={handleCalcEquals}
//                 activeOpacity={0.7}
//                 disabled={!calcOp || !calcBuffer}
//               >
//                 <Text style={styles.calcBtnEqualsText}>=</Text>
//               </TouchableOpacity>
//             </View>
//           </MotiView>

//           {/* ── Category Picker ── */}
//           <MotiView
//             from={{ opacity: 0, translateY: 10 }}
//             animate={{ opacity: 1, translateY: 0 }}
//             transition={{ type: 'spring', delay: 100, damping: 22, stiffness: 280 }}
//           >
//             <SectionLabel title="Category" />
//             <View style={styles.categoryGrid}>
//               {filteredCategories.map((cat) => {
//                 const isSelected = selectedCategoryId === cat.id;
//                 return (
//                   <TouchableOpacity
//                     key={cat.id}
//                     style={[
//                       styles.categoryChip,
//                       isSelected && {
//                         backgroundColor: cat.color + '22',
//                         borderColor: cat.color,
//                       },
//                       !!cat.is_loan_type && styles.categoryChipLoan,
//                       // cat.is_loan_type && styles.categoryChipLoan,
//                     ]}
//                     onPress={() => setSelectedCategoryId(cat.id)}
//                     activeOpacity={0.75}
//                   >
//                     <View
//                       style={[styles.catDot, { backgroundColor: cat.color }]}
//                     />
//                     <Text
//                       style={[
//                         styles.categoryChipText,
//                         isSelected && { color: cat.color, fontFamily: fonts.sansMedium },
//                       ]}
//                       numberOfLines={1}
//                     >
//                       {cat.name}
//                     </Text>
//                   </TouchableOpacity>
//                 );
//               })}
//             </View>

//             {/* Person name field for loan categories */}
//             <AnimatePresence>
//               {isLoanCategory && (
//                 <MotiView
//                   key="person-field"
//                   from={{ opacity: 0, height: 0 }}
//                   animate={{ opacity: 1, height: 56 }}
//                   exit={{ opacity: 0, height: 0 }}
//                   transition={{ type: 'timing', duration: 200 }}
//                   style={{ overflow: 'hidden' }}
//                 >
//                   <View style={styles.inputField}>
//                     <Ionicons name="person-outline" size={14} color={colors.textMuted} />
//                     <TextInput
//                       style={styles.inputText}
//                       placeholder="Person's name"
//                       placeholderTextColor={colors.textDisabled}
//                       value={personName}
//                       onChangeText={setPersonName}
//                       autoCapitalize="words"
//                     />
//                   </View>
//                 </MotiView>
//               )}
//             </AnimatePresence>
//           </MotiView>

//           {/* ── Date & Time ── */}
//           <MotiView
//             from={{ opacity: 0, translateY: 8 }}
//             animate={{ opacity: 1, translateY: 0 }}
//             transition={{ type: 'spring', delay: 130, damping: 22, stiffness: 280 }}
//           >
//             <SectionLabel title="Date & Time" />
//             <View style={styles.dateCard}>
//               <View style={styles.dateRow}>
//                 <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
//                 <Text style={styles.dateLabel} numberOfLines={1}>
//                   {dateLabel}
//                 </Text>
//                 <View style={styles.dateControls}>
//                   <TouchableOpacity
//                     style={styles.dateArrow}
//                     onPress={() => shiftDay(-1)}
//                     hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
//                   >
//                     <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.dateArrow}
//                     onPress={() => shiftDay(1)}
//                     hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
//                   >
//                     <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
//                   </TouchableOpacity>
//                 </View>
//               </View>
//               <View style={styles.dateDivider} />
//               <View style={styles.dateRow}>
//                 <Ionicons name="time-outline" size={15} color={colors.textMuted} />
//                 <Text style={styles.dateLabel}>{format(selectedDate, 'h:mm a')}</Text>
//                 <View style={styles.dateControls}>
//                   <TouchableOpacity
//                     style={styles.dateArrow}
//                     onPress={() => shiftHour(-1)}
//                     hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
//                   >
//                     <Ionicons name="remove-outline" size={16} color={colors.textMuted} />
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={styles.dateArrow}
//                     onPress={() => shiftHour(1)}
//                     hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
//                   >
//                     <Ionicons name="add-outline" size={16} color={colors.textMuted} />
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </View>
//           </MotiView>

//           {/* ── Status ── */}
//           <MotiView
//             from={{ opacity: 0, translateY: 8 }}
//             animate={{ opacity: 1, translateY: 0 }}
//             transition={{ type: 'spring', delay: 155, damping: 22, stiffness: 280 }}
//           >
//             <SectionLabel title="Status" />
//             <View style={styles.statusRow}>
//               {STATUS_OPTIONS.map((s) => (
//                 <TouchableOpacity
//                   key={s.key}
//                   style={[
//                     styles.statusChip,
//                     status === s.key && styles.statusChipActive,
//                   ]}
//                   onPress={() => setStatus(s.key)}
//                   activeOpacity={0.75}
//                 >
//                   <Text
//                     style={[
//                       styles.statusChipText,
//                       status === s.key && styles.statusChipTextActive,
//                     ]}
//                   >
//                     {s.label}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             <AnimatePresence>
//               {status === 'partial' && (
//                 <MotiView
//                   key="partial-field"
//                   from={{ opacity: 0, height: 0 }}
//                   animate={{ opacity: 1, height: 52 }}
//                   exit={{ opacity: 0, height: 0 }}
//                   transition={{ type: 'timing', duration: 180 }}
//                   style={{ overflow: 'hidden', marginTop: 8 }}
//                 >
//                   <View style={styles.inputField}>
//                     <Text style={styles.inputPrefix}>{currency}</Text>
//                     <TextInput
//                       style={styles.inputText}
//                       placeholder="Amount paid so far"
//                       placeholderTextColor={colors.textDisabled}
//                       value={paidAmount}
//                       onChangeText={setPaidAmount}
//                       keyboardType="decimal-pad"
//                     />
//                   </View>
//                 </MotiView>
//               )}
//             </AnimatePresence>
//           </MotiView>

//           {/* ── Payment Method ── */}
//           <MotiView
//             from={{ opacity: 0, translateY: 8 }}
//             animate={{ opacity: 1, translateY: 0 }}
//             transition={{ type: 'spring', delay: 180, damping: 22, stiffness: 280 }}
//           >
//             <SectionLabel title="Payment Method" />
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={styles.methodRow}
//             >
//               {PAYMENT_METHODS.map((m) => (
//                 <TouchableOpacity
//                   key={m.key}
//                   style={[
//                     styles.methodChip,
//                     method === m.key && styles.methodChipActive,
//                   ]}
//                   onPress={() => setMethod(m.key)}
//                   activeOpacity={0.75}
//                 >
//                   <Ionicons
//                     name={m.icon as any}
//                     size={13}
//                     color={method === m.key ? colors.textInverse : colors.textMuted}
//                   />
//                   <Text
//                     style={[
//                       styles.methodChipText,
//                       method === m.key && styles.methodChipTextActive,
//                     ]}
//                   >
//                     {m.label}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>
//           </MotiView>

//           {/* ── Note ── */}
//           <MotiView
//             from={{ opacity: 0, translateY: 8 }}
//             animate={{ opacity: 1, translateY: 0 }}
//             transition={{ type: 'spring', delay: 200, damping: 22, stiffness: 280 }}
//           >
//             <SectionLabel title="Note" />
//             <View style={[styles.inputField, { minHeight: 52 }]}>
//               <Ionicons name="create-outline" size={14} color={colors.textMuted} />
//               <TextInput
//                 style={[styles.inputText, { flex: 1, textAlignVertical: 'top' }]}
//                 placeholder="Add a note (optional)"
//                 placeholderTextColor={colors.textDisabled}
//                 value={note}
//                 onChangeText={setNote}
//                 multiline
//                 numberOfLines={2}
//               />
//             </View>
//           </MotiView>

//           {/* Spacer for the sticky button */}
//           <View style={{ height: 24 }} />
//         </ScrollView>
//       </KeyboardAvoidingView>

//       {/* ── Sticky Save Button ── */}
//       <MotiView
//         from={{ opacity: 0, translateY: 16 }}
//         animate={{ opacity: 1, translateY: 0 }}
//         transition={{ type: 'spring', delay: 220, damping: 22, stiffness: 280 }}
//         style={[styles.saveWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}
//       >
//         <TouchableOpacity
//           style={[
//             styles.saveBtn,
//             (!canSave || saving) && styles.saveBtnDisabled,
//           ]}
//           onPress={handleSave}
//           disabled={!canSave || saving}
//           activeOpacity={0.85}
//         >
//           {saving ? (
//             <ActivityIndicator size="small" color={colors.brandYellow} />
//           ) : (
//             <Text style={styles.saveBtnText}>Save Transaction</Text>
//           )}
//         </TouchableOpacity>
//       </MotiView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.surfaceBg,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingBottom: 12,
//     borderBottomWidth: 0.5,
//     borderBottomColor: colors.surfaceBorder,
//   },
//   headerTitle: {
//     fontFamily: fonts.sansBold,
//     fontSize: 16,
//     color: colors.textPrimary,
//   },
//   scroll: {
//     paddingHorizontal: 16,
//     paddingTop: 20,
//     gap: 20,
//   },
//   /* Direction toggle */
//   directionToggle: {
//     flexDirection: 'row',
//     borderRadius: 14,
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: colors.surfaceBorder,
//   },
//   dirBtn: {
//     flex: 1,
//     paddingVertical: 13,
//     alignItems: 'center',
//     backgroundColor: colors.surfaceCard,
//   },
//   dirBtnExpenseActive: {
//     backgroundColor: colors.expenseBg,
//     borderColor: colors.expense,
//   },
//   dirBtnIncomeActive: {
//     backgroundColor: colors.incomeBg,
//     borderColor: colors.income,
//   },
//   dirBtnLocked: {
//     opacity: 0.55,
//   },
//   dirBtnText: {
//     fontFamily: fonts.sansMedium,
//     fontSize: 14,
//     color: colors.textMuted,
//   },
//   dirBtnTextExpense: {
//     color: colors.expense,
//   },
//   dirBtnTextIncome: {
//     color: colors.income,
//   },
//   loanLockStrip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 5,
//     marginTop: 6,
//     paddingHorizontal: 2,
//   },
//   loanLockText: {
//     fontFamily: fonts.sans,
//     fontSize: 10,
//     color: colors.pending,
//   },
//   /* Amount */
//   amountSection: {
//     backgroundColor: colors.surfaceCard,
//     borderRadius: 18,
//     borderWidth: 0.5,
//     borderColor: colors.surfaceBorder,
//     padding: 16,
//     gap: 10,
//   },
//   amountRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     paddingHorizontal: 4,
//   },
//   currencyLabel: {
//     fontFamily: fonts.sansMedium,
//     fontSize: 15,
//     color: colors.textMuted,
//     minWidth: 36,
//   },
//   amountInput: {
//     fontFamily: fonts.mono,
//     fontSize: 34,
//     flex: 1,
//     letterSpacing: -0.5,
//     padding: 0,
//     margin: 0,
//   },
//   calcOpRow: {
//     paddingHorizontal: 4,
//   },
//   calcOpText: {
//     fontFamily: fonts.mono,
//     fontSize: 12,
//     color: colors.textMuted,
//     letterSpacing: -0.2,
//   },
//   khumusStrip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 5,
//     backgroundColor: colors.khumusBg,
//     borderRadius: 8,
//     paddingHorizontal: 10,
//     overflow: 'hidden',
//   },
//   khumusStripText: {
//     fontFamily: fonts.sans,
//     fontSize: 11,
//     color: colors.textMuted,
//     flex: 1,
//   },
//   khumusStripBold: {
//     fontFamily: fonts.sansMedium,
//     color: colors.khumus,
//   },
//   calcRow: {
//     flexDirection: 'row',
//     gap: 8,
//     paddingTop: 4,
//   },
//   calcBtn: {
//     width: 44,
//     height: 36,
//     borderRadius: 10,
//     backgroundColor: colors.surfaceElevated,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   calcBtnActive: {
//     backgroundColor: colors.brandNavy,
//   },
//   calcBtnText: {
//     fontFamily: fonts.sansBold,
//     fontSize: 16,
//     color: colors.textMuted,
//   },
//   calcBtnTextActive: {
//     color: colors.textInverse,
//   },
//   calcBtnEquals: {
//     backgroundColor: colors.brandViolet + '22',
//   },
//   calcBtnEqualsText: {
//     fontFamily: fonts.sansBold,
//     fontSize: 16,
//     color: colors.brandViolet,
//   },
//   /* Category grid */
//   categoryGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   categoryChip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: colors.surfaceBorder,
//     backgroundColor: colors.surfaceCard,
//     minWidth: '45%',
//     flex: 1,
//   },
//   categoryChipLoan: {
//     borderColor: colors.loanBg,
//     backgroundColor: colors.loanBg,
//   },
//   catDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//   },
//   categoryChipText: {
//     fontFamily: fonts.sans,
//     fontSize: 12,
//     color: colors.textPrimary,
//     flex: 1,
//   },
//   /* Input field */
//   inputField: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//     backgroundColor: colors.surfaceCard,
//     borderRadius: 12,
//     borderWidth: 0.5,
//     borderColor: colors.surfaceBorder,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//   },
//   inputPrefix: {
//     fontFamily: fonts.sansMedium,
//     fontSize: 13,
//     color: colors.textMuted,
//   },
//   inputText: {
//     fontFamily: fonts.sans,
//     fontSize: 13,
//     color: colors.textPrimary,
//     flex: 1,
//     padding: 0,
//     margin: 0,
//   },
//   /* Date card */
//   dateCard: {
//     backgroundColor: colors.surfaceCard,
//     borderRadius: 14,
//     borderWidth: 0.5,
//     borderColor: colors.surfaceBorder,
//     overflow: 'hidden',
//   },
//   dateRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 14,
//     paddingVertical: 13,
//     gap: 10,
//   },
//   dateLabel: {
//     fontFamily: fonts.sansMedium,
//     fontSize: 13,
//     color: colors.textPrimary,
//     flex: 1,
//   },
//   dateControls: {
//     flexDirection: 'row',
//     gap: 2,
//   },
//   dateArrow: {
//     width: 30,
//     height: 30,
//     borderRadius: 8,
//     backgroundColor: colors.surfaceElevated,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   dateDivider: {
//     height: 0.5,
//     backgroundColor: colors.surfaceBorder,
//     marginHorizontal: 14,
//   },
//   /* Status chips */
//   statusRow: {
//     flexDirection: 'row',
//     gap: 8,
//     flexWrap: 'wrap',
//   },
//   statusChip: {
//     paddingHorizontal: 14,
//     paddingVertical: 8,
//     borderRadius: 100,
//     borderWidth: 1,
//     borderColor: colors.surfaceBorder,
//     backgroundColor: colors.surfaceCard,
//   },
//   statusChipActive: {
//     backgroundColor: colors.brandNavy,
//     borderColor: colors.brandNavy,
//   },
//   statusChipText: {
//     fontFamily: fonts.sansMedium,
//     fontSize: 12,
//     color: colors.textMuted,
//   },
//   statusChipTextActive: {
//     color: colors.textInverse,
//   },
//   /* Payment method */
//   methodRow: {
//     gap: 8,
//     paddingRight: 4,
//   },
//   methodChip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 5,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 100,
//     borderWidth: 1,
//     borderColor: colors.surfaceBorder,
//     backgroundColor: colors.surfaceCard,
//   },
//   methodChipActive: {
//     backgroundColor: colors.brandNavy,
//     borderColor: colors.brandNavy,
//   },
//   methodChipText: {
//     fontFamily: fonts.sansMedium,
//     fontSize: 12,
//     color: colors.textMuted,
//   },
//   methodChipTextActive: {
//     color: colors.textInverse,
//   },
//   /* Save */
//   saveWrap: {
//     paddingHorizontal: 16,
//     paddingTop: 12,
//     borderTopWidth: 0.5,
//     borderTopColor: colors.surfaceBorder,
//     backgroundColor: colors.surfaceBg,
//   },
//   saveBtn: {
//     backgroundColor: colors.brandNavy,
//     borderRadius: 14,
//     paddingVertical: 15,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   saveBtnDisabled: {
//     opacity: 0.45,
//   },
//   saveBtnText: {
//     fontFamily: fonts.sansBold,
//     fontSize: 15,
//     color: colors.brandYellow,
//     letterSpacing: 0.2,
//   },
// });



import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, addDays, subDays } from 'date-fns';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { formatAmount } from '../utils/currency';
import { useCategories } from '../hooks/useCategories';
import { useSettingsStore } from '../stores/settingsStore';
import { useToastStore } from '../stores/toastStore';
import { useSQLiteContext } from 'expo-sqlite';
import { createTransaction } from '../queries/transactions';
import { createLoan } from '../queries/loans';
import { Flow, PaymentMethod, TransactionStatus } from '../types';
import { useDataRefreshStore } from '../stores/dataRefreshStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type CalcOp = '+' | '−' | '×' | null;

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
  { key: 'card', label: 'Card', icon: 'card-outline' },
  { key: 'gpay', label: 'GPay', icon: 'phone-portrait-outline' },
  { key: 'bank', label: 'Bank', icon: 'business-outline' },
  { key: 'cheque', label: 'Cheque', icon: 'document-text-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const STATUS_OPTIONS: { key: TransactionStatus; label: string }[] = [
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
  { key: 'partial', label: 'Partial' },
  { key: 'cancelled', label: 'Cancelled' },
];

// ─── Small helper components ──────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return <Text style={sectionStyle}>{title}</Text>;
}

const sectionStyle: object = {
  fontFamily: fonts.sansMedium,
  fontSize: 11,
  color: colors.textMuted,
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  marginBottom: 6,
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const addRecentCategory = useSettingsStore((s) => s.addRecentCategory);
  const showToast = useToastStore((s) => s.showToast);

  const refresh = useDataRefreshStore(s => s.refresh);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 500);
  }, [refresh]);

  const categories = useCategories();

  // ── Form state ────────────────────────────────────────────────────────────
  const [flow, setFlow] = useState<Flow>('OUT');
  const [amount, setAmount] = useState('');
  const [calcBuffer, setCalcBuffer] = useState('');
  const [calcOp, setCalcOp] = useState<CalcOp>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [personName, setPersonName] = useState('');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [status, setStatus] = useState<TransactionStatus>('completed');
  const [paidAmount, setPaidAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');

  const [saving, setSaving] = useState(false);

  const amountRef = useRef<TextInput>(null);

  // ── Derived values ────────────────────────────────────────────────────────

  const numericAmount = useMemo(() => parseFloat(amount) || 0, [amount]);

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (c) => c.flow_type === flow || c.flow_type === 'BOTH'
    );
  }, [categories, flow]);

  const selectedCategory = useMemo(
    () => (selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : null),
    [categories, selectedCategoryId]
  );

  const isLoanCategory = selectedCategory?.is_loan_type ?? false;
  const isKhumusEligible = selectedCategory?.khumus_eligible ?? false;
  const khumusShare = isKhumusEligible && !isLoanCategory ? numericAmount / 5 : 0;

  const canSave = numericAmount > 0 && !!selectedCategoryId;

  // Lock flow when loan category selected
  useEffect(() => {
    if (!selectedCategory?.is_loan_type) return;
    const LOAN_FLOW: Record<string, Flow> = {
      'Loan Given': 'OUT',
      'Loan Received': 'IN',
      'Loan Repaid': 'IN',
      'I Repaid Loan': 'OUT',
    };
    const locked = LOAN_FLOW[selectedCategory.name];
    if (locked) setFlow(locked);
  }, [selectedCategory]);

  // Reset category when flow changes
  function handleFlowChange(newFlow: Flow) {
    if (isLoanCategory) return; // can't change flow if loan category is selected
    setFlow(newFlow);
    setSelectedCategoryId(null);
  }

  // ── Calculator ────────────────────────────────────────────────────────────

  function applyCalcOp(op: CalcOp) {
    const base = parseFloat(amount) || 0;
    const buf = parseFloat(calcBuffer) || 0;

    if (calcBuffer && calcOp) {
      let result = base;
      if (calcOp === '+') result = base + buf;
      else if (calcOp === '−') result = base - buf;
      else if (calcOp === '×') result = base * buf;
      const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(2);
      setAmount(formatted);
      setCalcBuffer('');
    }
    setCalcOp(op);
  }

  function handleCalcEquals() {
    if (!calcBuffer || !calcOp) return;
    const base = parseFloat(amount) || 0;
    const buf = parseFloat(calcBuffer) || 0;
    let result = base;
    if (calcOp === '+') result = base + buf;
    else if (calcOp === '−') result = base - buf;
    else if (calcOp === '×') result = base * buf;
    const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(2);
    setAmount(formatted);
    setCalcBuffer('');
    setCalcOp(null);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!canSave || saving) return;

    setSaving(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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
        method,
        note: note.trim() || undefined,
        loan_id,
        paid_amount: status === 'partial' ? (parseFloat(paidAmount) || 0) : undefined,
        created_at: selectedDate.getTime(),
      });

      addRecentCategory(selectedCategoryId!);

      const catName = selectedCategory?.name ?? '';
      const prefix = flow === 'IN' ? '+ ' : '− ';
      showToast(
        'Transaction added',
        `${prefix}${currency} ${formatAmount(numericAmount)} · ${catName}`
      );

      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Could not save transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Date helpers ──────────────────────────────────────────────────────────

  const dateLabel = useMemo(() => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    if (format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return `Today, ${format(selectedDate, 'h:mm a')}`;
    }
    if (format(selectedDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return `Yesterday, ${format(selectedDate, 'h:mm a')}`;
    }
    return format(selectedDate, 'dd MMM yyyy, h:mm a');
  }, [selectedDate]);

  function shiftDay(delta: number) {
    setSelectedDate((d) => (delta > 0 ? addDays(d, 1) : subDays(d, 1)));
  }

  function shiftHour(delta: number) {
    setSelectedDate((d) => new Date(d.getTime() + delta * 3_600_000));
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={{ width: 28 }} />
        <Text style={styles.headerTitle}>Add Transaction</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </MotiView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brandYellow]} />}
        >
          {/* ── Direction Toggle ── */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 40, damping: 22, stiffness: 280 }}
          >
            <View style={styles.directionToggle}>
              <TouchableOpacity
                style={[
                  styles.dirBtn,
                  flow === 'OUT' && styles.dirBtnExpenseActive,
                  !!isLoanCategory && styles.dirBtnLocked,
                ]}
                onPress={() => handleFlowChange('OUT')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dirBtnText,
                    flow === 'OUT' && styles.dirBtnTextExpense,
                  ]}
                >
                  − Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dirBtn,
                  flow === 'IN' && styles.dirBtnIncomeActive,
                  !!isLoanCategory && styles.dirBtnLocked,
                ]}
                onPress={() => handleFlowChange('IN')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dirBtnText,
                    flow === 'IN' && styles.dirBtnTextIncome,
                  ]}
                >
                  + Income
                </Text>
              </TouchableOpacity>
            </View>
            {isLoanCategory && (
              <View style={styles.loanLockStrip}>
                <Ionicons name="lock-closed-outline" size={11} color={colors.pending} />
                <Text style={styles.loanLockText}>Direction set automatically for loans</Text>
              </View>
            )}
          </MotiView>

          {/* ── Amount Field ── */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 70, damping: 22, stiffness: 280 }}
            style={styles.amountSection}
          >
            <TouchableOpacity
              style={styles.amountRow}
              onPress={() => amountRef.current?.focus()}
              activeOpacity={0.9}
            >
              <Text style={styles.currencyLabel}>{currency}</Text>
              <TextInput
                ref={amountRef}
                style={[
                  styles.amountInput,
                  { color: flow === 'IN' ? colors.income : colors.expense },
                ]}
                value={calcBuffer || amount}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9.]/g, '');
                  if (calcOp) {
                    setCalcBuffer(clean);
                  } else {
                    setAmount(clean);
                  }
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textDisabled}
                autoFocus
              />
            </TouchableOpacity>

            {/* Calc op indicator */}
            {calcOp && (
              <View style={styles.calcOpRow}>
                <Text style={styles.calcOpText}>
                  {formatAmount(parseFloat(amount) || 0)} {calcOp}
                  {calcBuffer ? ` ${calcBuffer}` : ''}
                </Text>
              </View>
            )}

            {/* Khumus info strip */}
            {isKhumusEligible && numericAmount > 0 && (
              <AnimatePresence>
                <MotiView
                  key="khumus-strip"
                  from={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 30 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'timing', duration: 180 }}
                  style={styles.khumusStrip}
                >
                  <Ionicons name="star-outline" size={11} color={colors.khumus} />
                  <Text style={styles.khumusStripText}>
                    Khumus share:{' '}
                    <Text style={styles.khumusStripBold}>
                      {currency} {formatAmount(khumusShare)}
                    </Text>{' '}
                    will be added automatically
                  </Text>
                </MotiView>
              </AnimatePresence>
            )}

            {/* Inline calculator */}
            <View style={styles.calcRow}>
              {(['+'as CalcOp, '−' as CalcOp, '×' as CalcOp] as CalcOp[]).map((op) => (
                <TouchableOpacity
                  key={op!}
                  style={[styles.calcBtn, calcOp === op && styles.calcBtnActive]}
                  onPress={() => applyCalcOp(op)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.calcBtnText, calcOp === op && styles.calcBtnTextActive]}>
                    {op}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.calcBtn, styles.calcBtnEquals]}
                onPress={handleCalcEquals}
                activeOpacity={0.7}
                disabled={!calcOp || !calcBuffer}
              >
                <Text style={styles.calcBtnEqualsText}>=</Text>
              </TouchableOpacity>
            </View>
          </MotiView>

          {/* ── Category Picker ── */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 100, damping: 22, stiffness: 280 }}
          >
            <SectionLabel title="Category" />
            <View style={styles.categoryGrid}>
              {filteredCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      isSelected && {
                        backgroundColor: cat.color + '22',
                        borderColor: cat.color,
                      },
                      !!cat.is_loan_type && styles.categoryChipLoan,
                      // cat.is_loan_type && styles.categoryChipLoan,
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[styles.catDot, { backgroundColor: cat.color }]}
                    />
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

            {/* Person name field for loan categories */}
            <AnimatePresence>
              {isLoanCategory && (
                <MotiView
                  key="person-field"
                  from={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 56 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'timing', duration: 200 }}
                  style={{ overflow: 'hidden' }}
                >
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
                </MotiView>
              )}
            </AnimatePresence>
          </MotiView>

          {/* ── Date & Time ── */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 130, damping: 22, stiffness: 280 }}
          >
            <SectionLabel title="Date & Time" />
            <View style={styles.dateCard}>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                <Text style={styles.dateLabel} numberOfLines={1}>
                  {dateLabel}
                </Text>
                <View style={styles.dateControls}>
                  <TouchableOpacity
                    style={styles.dateArrow}
                    onPress={() => shiftDay(-1)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateArrow}
                    onPress={() => shiftDay(1)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.dateDivider} />
              <View style={styles.dateRow}>
                <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                <Text style={styles.dateLabel}>{format(selectedDate, 'h:mm a')}</Text>
                <View style={styles.dateControls}>
                  <TouchableOpacity
                    style={styles.dateArrow}
                    onPress={() => shiftHour(-1)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="remove-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateArrow}
                    onPress={() => shiftHour(1)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="add-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </MotiView>

          {/* ── Status ── */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 155, damping: 22, stiffness: 280 }}
          >
            <SectionLabel title="Status" />
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.statusChip,
                    status === s.key && styles.statusChipActive,
                  ]}
                  onPress={() => setStatus(s.key)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      status === s.key && styles.statusChipTextActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <AnimatePresence>
              {status === 'partial' && (
                <MotiView
                  key="partial-field"
                  from={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 52 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'timing', duration: 180 }}
                  style={{ overflow: 'hidden', marginTop: 8 }}
                >
                  <View style={styles.inputField}>
                    <Text style={styles.inputPrefix}>{currency}</Text>
                    <TextInput
                      style={styles.inputText}
                      placeholder="Amount paid so far"
                      placeholderTextColor={colors.textDisabled}
                      value={paidAmount}
                      onChangeText={setPaidAmount}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </MotiView>
              )}
            </AnimatePresence>
          </MotiView>

          {/* ── Payment Method ── */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 180, damping: 22, stiffness: 280 }}
          >
            <SectionLabel title="Payment Method" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.methodRow}
            >
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    styles.methodChip,
                    method === m.key && styles.methodChipActive,
                  ]}
                  onPress={() => setMethod(m.key)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={13}
                    color={method === m.key ? colors.textInverse : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.methodChipText,
                      method === m.key && styles.methodChipTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </MotiView>

          {/* ── Note ── */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 200, damping: 22, stiffness: 280 }}
          >
            <SectionLabel title="Note" />
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
          </MotiView>

          {/* Spacer for the sticky button */}
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky Save Button ── */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 220, damping: 22, stiffness: 280 }}
        style={[styles.saveWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <TouchableOpacity
          style={[
            styles.saveBtn,
            (!canSave || saving) && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.brandYellow} />
          ) : (
            <Text style={styles.saveBtnText}>Save Transaction</Text>
          )}
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.surfaceBorder,
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 20,
  },
  /* Direction toggle */
  directionToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  dirBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
  },
  dirBtnExpenseActive: {
    backgroundColor: colors.expenseBg,
    borderColor: colors.expense,
  },
  dirBtnIncomeActive: {
    backgroundColor: colors.incomeBg,
    borderColor: colors.income,
  },
  dirBtnLocked: {
    opacity: 0.55,
  },
  dirBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  dirBtnTextExpense: {
    color: colors.expense,
  },
  dirBtnTextIncome: {
    color: colors.income,
  },
  loanLockStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  loanLockText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.pending,
  },
  /* Amount */
  amountSection: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    padding: 16,
    gap: 10,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  currencyLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textMuted,
    minWidth: 36,
  },
  amountInput: {
    fontFamily: fonts.mono,
    fontSize: 34,
    flex: 1,
    letterSpacing: -0.5,
    padding: 0,
    margin: 0,
  },
  calcOpRow: {
    paddingHorizontal: 4,
  },
  calcOpText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: -0.2,
  },
  khumusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.khumusBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  khumusStripText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  khumusStripBold: {
    fontFamily: fonts.sansMedium,
    color: colors.khumus,
  },
  calcRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  calcBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcBtnActive: {
    backgroundColor: colors.brandNavy,
  },
  calcBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.textMuted,
  },
  calcBtnTextActive: {
    color: colors.textInverse,
  },
  calcBtnEquals: {
    backgroundColor: colors.brandViolet + '22',
  },
  calcBtnEqualsText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.brandViolet,
  },
  /* Category grid */
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
  categoryChipLoan: {
    borderColor: colors.loanBg,
    backgroundColor: colors.loanBg,
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
  /* Input field */
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
  inputPrefix: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  inputText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    padding: 0,
    margin: 0,
  },
  /* Date card */
  dateCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  dateLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  dateControls: {
    flexDirection: 'row',
    gap: 2,
  },
  dateArrow: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDivider: {
    height: 0.5,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 14,
  },
  /* Status chips */
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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
  /* Payment method */
  methodRow: {
    gap: 8,
    paddingRight: 4,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceCard,
  },
  methodChipActive: {
    backgroundColor: colors.brandNavy,
    borderColor: colors.brandNavy,
  },
  methodChipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  methodChipTextActive: {
    color: colors.textInverse,
  },
  /* Save */
  saveWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceBg,
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
    fontSize: 15,
    color: colors.brandYellow,
    letterSpacing: 0.2,
  },
});
