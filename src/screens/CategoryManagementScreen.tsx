import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  PanResponder,
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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { useCategories, RawCategory } from '../hooks/useCategories';
import { useSettingsStore } from '../stores/settingsStore';
import { createCategory, updateCategory, deleteCategory, reorderCategories } from '../queries/categories';
import { useDataRefreshStore } from '../stores/dataRefreshStore';
import { useColors } from '../theme/useColors';
import type { ColorScheme } from '../theme/colors';
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
const DRAG_ROW_HEIGHT = 53;
const GROUP_OFFSET = 100000; // large enough that no single group will ever reach this many rows

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortCategories(cats: RawCategory[]): RawCategory[] {
  return [...cats].sort((a, b) => a.sort_order - b.sort_order);
}

function splitByPinned(cats: RawCategory[], pinnedNames: string[]) {
  return {
    on: sortCategories(cats.filter((c) => pinnedNames.includes(c.name))),
    off: sortCategories(cats.filter((c) => !pinnedNames.includes(c.name))),
  };
}

// ─── SystemInfoSheet ──────────────────────────────────────────────────────────

function SystemInfoSheet({
  category,
  onClose,
}: {
  category: RawCategory | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const sysStyles = useMemo(() => createSysStyles(colors), [colors]);
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
  const colors = useColors();
  const sheetStyles = useMemo(() => createSheetStyles(colors), [colors]);
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
      <KeyboardAvoidingView style={sheetStyles.kav} behavior="padding">
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
  dragHandlers,
}: {
  category: RawCategory;
  isOn: boolean;
  onToggle: () => void;
  onPressRow: () => void;
  onDelete: () => void;
  dragHandlers?: object;
}) {
  const colors = useColors();
  const rowStyles = useMemo(() => createRowStyles(colors), [colors]);
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
        {dragHandlers && (
          <View {...dragHandlers} style={rowStyles.dragHandle}>
            <MaterialIcons name="drag-indicator" size={20} color={colors.textDisabled} />
          </View>
        )}
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
        />
      </Animated.View>
    </View>
  );
}

// ─── LoanCategoryRow ──────────────────────────────────────────────────────────

function LoanCategoryRow({ category }: { category: RawCategory }) {
  const colors = useColors();
  const rowStyles = useMemo(() => createRowStyles(colors), [colors]);
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
  dragHandlers,
}: {
  category: RawCategory;
  isOn: boolean;
  onToggle: () => void;
  onPress: () => void;
  dragHandlers?: object;
}) {
  const colors = useColors();
  const rowStyles = useMemo(() => createRowStyles(colors), [colors]);
  return (
    <TouchableOpacity style={rowStyles.rowBase} onPress={onPress} activeOpacity={0.75}>
      {dragHandlers && (
        <View {...dragHandlers} style={rowStyles.dragHandle}>
          <MaterialIcons name="drag-indicator" size={20} color={colors.textDisabled} />
        </View>
      )}
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
  const colors = useColors();
  const secStyles = useMemo(() => createSecStyles(colors), [colors]);
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

// ─── DraggableRow ─────────────────────────────────────────────────────────────
//
// Reordering is triggered by a dedicated drag handle (a long-press on the
// whole row fought with the ScrollView/tap/swipe gestures on-device).

interface DragCtx {
  orderRef: React.MutableRefObject<RawCategory[]>;
  draggingRef: React.MutableRefObject<{ id: string; startIndex: number; currentIndex: number } | null>;
  dragY: Animated.Value;
  setOrder: (next: RawCategory[]) => void;
  setDraggingId: (id: string | null) => void;
  getOnReorder: () => (ids: string[]) => void;
}

const DraggableRow = React.memo(function DraggableRow({
  cat,
  isLast,
  isOn,
  isDragging,
  dragCtx,
  onToggle,
  onPressRow,
  onDelete,
}: {
  cat: RawCategory;
  isLast: boolean;
  isOn: boolean;
  isDragging: boolean;
  dragCtx: DragCtx;
  onToggle: (cat: RawCategory) => void;
  onPressRow: (cat: RawCategory) => void;
  onDelete: (cat: RawCategory) => void;
}) {
  const colors = useColors();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const catRef = useRef(cat);
  catRef.current = cat;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const startIndex = dragCtx.orderRef.current.findIndex((c) => c.id === catRef.current.id);
        dragCtx.draggingRef.current = { id: catRef.current.id, startIndex, currentIndex: startIndex };
        dragCtx.dragY.setValue(0);
        dragCtx.setDraggingId(catRef.current.id);
      },
      onPanResponderMove: (_, gs) => {
        const drag = dragCtx.draggingRef.current;
        if (!drag) return;
        const len = dragCtx.orderRef.current.length;
        const rawTarget = drag.startIndex + Math.round(gs.dy / DRAG_ROW_HEIGHT);
        const target = Math.max(0, Math.min(len - 1, rawTarget));
        if (target !== drag.currentIndex) {
          const next = [...dragCtx.orderRef.current];
          const fromIdx = next.findIndex((c) => c.id === drag.id);
          if (fromIdx !== -1) {
            const [moved] = next.splice(fromIdx, 1);
            next.splice(target, 0, moved);
            dragCtx.setOrder(next);
          }
          drag.currentIndex = target;
        }
        const naturalShift = (drag.currentIndex - drag.startIndex) * DRAG_ROW_HEIGHT;
        dragCtx.dragY.setValue(gs.dy - naturalShift);
      },
      onPanResponderRelease: () => finishDrag(),
      onPanResponderTerminate: () => finishDrag(),
    })
  ).current;

  function finishDrag() {
    const drag = dragCtx.draggingRef.current;
    Animated.spring(dragCtx.dragY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    dragCtx.draggingRef.current = null;
    dragCtx.setDraggingId(null);
    if (drag && drag.currentIndex !== drag.startIndex) {
      dragCtx.getOnReorder()(dragCtx.orderRef.current.map((c) => c.id));
    }
  }

  return (
    <Animated.View
      style={[
        cardStyles.rowWrap,
        isDragging && {
          transform: [{ translateY: dragCtx.dragY }],
          zIndex: 50,
          elevation: 8,
          shadowColor: colors.shadow,
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        },
      ]}
    >
      {cat.is_system === 1 ? (
        <SystemCategoryRow
          category={cat}
          isOn={isOn}
          onToggle={() => onToggle(cat)}
          onPress={() => onPressRow(cat)}
          dragHandlers={responder.panHandlers}
        />
      ) : (
        <SwipeableCategoryRow
          category={cat}
          isOn={isOn}
          onToggle={() => onToggle(cat)}
          onPressRow={() => onPressRow(cat)}
          onDelete={() => onDelete(cat)}
          dragHandlers={responder.panHandlers}
        />
      )}
      {!isLast && <View style={cardStyles.rowSeparator} />}
    </Animated.View>
  );
});

// ─── DraggableCategoryGroup ───────────────────────────────────────────────────

function DraggableCategoryGroup({
  items,
  pinnedNames,
  onToggle,
  onPressRow,
  onDelete,
  onReorder,
}: {
  items: RawCategory[];
  pinnedNames: string[];
  onToggle: (cat: RawCategory) => void;
  onPressRow: (cat: RawCategory) => void;
  onDelete: (cat: RawCategory) => void;
  onReorder: (ids: string[]) => void;
}) {
  const [order, setOrderState] = useState(items);
  const orderRef = useRef(order);
  const draggingRef = useRef<{ id: string; startIndex: number; currentIndex: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  useEffect(() => {
    if (draggingRef.current) return;
    orderRef.current = items;
    setOrderState(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const dragCtx = useRef<DragCtx>({
    orderRef,
    draggingRef,
    dragY,
    setOrder: (next) => {
      orderRef.current = next;
      setOrderState(next);
    },
    setDraggingId,
    getOnReorder: () => onReorderRef.current,
  }).current;

  if (order.length === 0) return null;

  return (
    <>
      {order.map((cat, idx) => (
        <DraggableRow
          key={cat.id}
          cat={cat}
          isLast={idx === order.length - 1}
          isOn={pinnedNames.includes(cat.name)}
          isDragging={draggingId === cat.id}
          dragCtx={dragCtx}
          onToggle={onToggle}
          onPressRow={onPressRow}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

// ─── CategorySection ──────────────────────────────────────────────────────────

type CategorySectionProps =
  | {
      title: string;
      kind: 'regular';
      onItems: RawCategory[];
      offItems: RawCategory[];
      pinnedNames: string[];
      onToggle: (cat: RawCategory) => void;
      onPressRow: (cat: RawCategory) => void;
      onDelete: (cat: RawCategory) => void;
      onReorderOn: (ids: string[]) => void;
      onReorderOff: (ids: string[]) => void;
      hideLabel?: boolean;
    }
  | {
      title: string;
      kind: 'loan';
      items: RawCategory[];
    };

function CategorySection(props: CategorySectionProps) {
  const colors = useColors();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  if (props.kind === 'loan') {
    if (props.items.length === 0) return null;
    return (
      <View>
        <SectionLabel title={props.title} />
        <View style={cardStyles.card}>
          {props.items.map((cat, idx) => (
            <View key={cat.id} style={cardStyles.rowWrap}>
              <LoanCategoryRow category={cat} />
              {idx !== props.items.length - 1 && <View style={cardStyles.rowSeparator} />}
            </View>
          ))}
        </View>
      </View>
    );
  }

  const { title, onItems, offItems, pinnedNames, onToggle, onPressRow, onDelete, onReorderOn, onReorderOff, hideLabel } = props;
  if (onItems.length === 0 && offItems.length === 0) return null;

  return (
    <View>
      {!hideLabel && <SectionLabel title={title} />}
      <View style={cardStyles.card}>
        <DraggableCategoryGroup
          items={onItems}
          pinnedNames={pinnedNames}
          onToggle={onToggle}
          onPressRow={onPressRow}
          onDelete={onDelete}
          onReorder={onReorderOn}
        />
        {onItems.length > 0 && offItems.length > 0 && <View style={cardStyles.divider} />}
        <DraggableCategoryGroup
          items={offItems}
          pinnedNames={pinnedNames}
          onToggle={onToggle}
          onPressRow={onPressRow}
          onDelete={onDelete}
          onReorder={onReorderOff}
        />
      </View>
    </View>
  );
}

// ─── CategoryManagementScreen ─────────────────────────────────────────────────

export default function CategoryManagementScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const db = useSQLiteContext();
  const categories = useCategories();
  const pinnedCategoryNames = useSettingsStore((s) => s.pinnedCategoryNames);
  const setPinnedCategoryNames = useSettingsStore((s) => s.setPinnedCategoryNames);

  const [systemInfoCat, setSystemInfoCat] = useState<RawCategory | null>(null);
  const [editSheetCat, setEditSheetCat] = useState<RawCategory | undefined>(undefined);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [activeFlowTab, setActiveFlowTab] = useState<'income' | 'expense'>('expense');

  // ── Derived buckets ───────────────────────────────────────────────────────

  const incomeSplit = useMemo(
    () =>
      splitByPinned(
        categories.filter((c) => c.is_loan_type === 0 && c.flow_type === 'IN'),
        pinnedCategoryNames
      ),
    [categories, pinnedCategoryNames]
  );

  const expenseSplit = useMemo(
    () =>
      splitByPinned(
        categories.filter((c) => c.is_loan_type === 0 && (c.flow_type === 'OUT' || c.flow_type === 'BOTH')),
        pinnedCategoryNames
      ),
    [categories, pinnedCategoryNames]
  );

  const loanItems = useMemo(
    () => sortCategories(categories.filter((c) => c.is_loan_type === 1)),
    [categories]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleReorder = useCallback(
    (ids: string[], groupIndex: number) => {
      reorderCategories(db, ids, groupIndex * GROUP_OFFSET).then(() => {
        useDataRefreshStore.getState().refresh();
      });
    },
    [db]
  );

  const handleReorderIncomeOn = useCallback((ids: string[]) => handleReorder(ids, 0), [handleReorder]);
  const handleReorderIncomeOff = useCallback((ids: string[]) => handleReorder(ids, 1), [handleReorder]);
  const handleReorderExpenseOn = useCallback((ids: string[]) => handleReorder(ids, 2), [handleReorder]);
  const handleReorderExpenseOff = useCallback((ids: string[]) => handleReorder(ids, 3), [handleReorder]);

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

      {/* ── Flow Tabs ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeFlowTab === 'income' && styles.tabItemActiveIncome,
          ]}
          onPress={() => setActiveFlowTab('income')}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.tabText,
              activeFlowTab === 'income' && styles.tabTextActiveIncome,
            ]}
          >
            Income
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeFlowTab === 'expense' && styles.tabItemActiveExpense,
          ]}
          onPress={() => setActiveFlowTab('expense')}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.tabText,
              activeFlowTab === 'expense' && styles.tabTextActiveExpense,
            ]}
          >
            Expense
          </Text>
        </TouchableOpacity>
      </View>

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
          {activeFlowTab === 'income' ? (
            <CategorySection
              key="income"
              kind="regular"
              title="INCOME"
              onItems={incomeSplit.on}
              offItems={incomeSplit.off}
              pinnedNames={pinnedCategoryNames}
              onToggle={handleToggle}
              onPressRow={handlePressRow}
              onDelete={handleDelete}
              onReorderOn={handleReorderIncomeOn}
              onReorderOff={handleReorderIncomeOff}
              hideLabel
            />
          ) : (
            <CategorySection
              key="expense"
              kind="regular"
              title="EXPENSE"
              onItems={expenseSplit.on}
              offItems={expenseSplit.off}
              pinnedNames={pinnedCategoryNames}
              onToggle={handleToggle}
              onPressRow={handlePressRow}
              onDelete={handleDelete}
              onReorderOn={handleReorderExpenseOn}
              onReorderOff={handleReorderExpenseOff}
              hideLabel
            />
          )}

          <CategorySection kind="loan" title="LOANS" items={loanItems} />
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

const createStyles = (colors: ColorScheme) => StyleSheet.create({
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  tabItemActiveIncome: {
    backgroundColor: colors.incomeBg,
    borderColor: colors.income,
  },
  tabItemActiveExpense: {
    backgroundColor: colors.expenseBg,
    borderColor: colors.expense,
  },
  tabText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabTextActiveIncome: {
    color: colors.income,
    fontFamily: fonts.sansBold,
  },
  tabTextActiveExpense: {
    color: colors.expense,
    fontFamily: fonts.sansBold,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
});

// Card wrapper for each section
const createCardStyles = (colors: ColorScheme) => StyleSheet.create({
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
const createRowStyles = (colors: ColorScheme) => StyleSheet.create({
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
    paddingHorizontal: 14,
    gap: 12,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  rowBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
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
  dragHandle: {
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
});

// Section label styles
const createSecStyles = (colors: ColorScheme) => StyleSheet.create({
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
const createSysStyles = (colors: ColorScheme) => StyleSheet.create({
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
const createSheetStyles = (colors: ColorScheme) => StyleSheet.create({
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
