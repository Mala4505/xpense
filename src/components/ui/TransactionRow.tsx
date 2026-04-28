import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { formatAmount } from '../../utils/currency';
import { formatTransactionDate, formatTransactionTime } from '../../utils/date';
import { CategoryIcon } from './CategoryIcon';
import { StatusBadge } from './StatusBadge';
import { RawTransaction } from '../../hooks/useTransactions';
import { RawCategory } from '../../hooks/useCategories';

interface TransactionRowProps {
  transaction: RawTransaction;
  category?: RawCategory;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  animationIndex?: number;
  style?: ViewStyle;
}

const SWIPE_THRESHOLD = 80;
const DELETE_ZONE = 80;
const EDIT_ZONE = 80;

function SwipeableRow({
  children,
  onDelete,
  onEdit,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const translateX = useSharedValue(0);
  const isOpen = useSharedValue<'none' | 'delete' | 'edit'>('none');

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(-DELETE_ZONE - 20, e.translationX);
      } else if (e.translationX > 0) {
        translateX.value = Math.min(EDIT_ZONE + 20, e.translationX);
      }
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD / 2) {
        translateX.value = withSpring(-DELETE_ZONE, { damping: 20, stiffness: 300 });
        isOpen.value = 'delete';
      } else if (e.translationX > SWIPE_THRESHOLD / 2) {
        translateX.value = withSpring(EDIT_ZONE, { damping: 20, stiffness: 300 });
        isOpen.value = 'edit';
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        isOpen.value = 'none';
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const editOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(1, translateX.value / EDIT_ZONE),
    width: EDIT_ZONE,
  }));

  const deleteOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(1, -translateX.value / DELETE_ZONE),
    width: DELETE_ZONE,
  }));

  function handleEditTap() {
    translateX.value = withSpring(0, { damping: 25, stiffness: 400 });
    isOpen.value = 'none';
    onEdit();
  }

  function handleDeleteTap() {
    translateX.value = withSpring(0, { damping: 25, stiffness: 400 });
    isOpen.value = 'none';
    onDelete();
  }

  return (
    <View style={styles.swipeContainer}>
      {/* Edit button — left side, blue */}
      <Animated.View style={[styles.editBackground, editOpacity]}>
        <TouchableOpacity onPress={handleEditTap} style={styles.actionButton}>
          <Ionicons name="pencil-outline" size={18} color={colors.textInverse} />
          <Text style={styles.actionLabel}>Edit</Text>
        </TouchableOpacity>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>

      {/* Delete button — right side, red */}
      <Animated.View style={[styles.deleteBackground, deleteOpacity]}>
        <TouchableOpacity onPress={handleDeleteTap} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={18} color={colors.textInverse} />
          <Text style={styles.actionLabel}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export function TransactionRow({
  transaction,
  category,
  onPress,
  onLongPress,
  onDelete,
  onEdit,
  animationIndex = 0,
  style,
}: TransactionRowProps) {
  const isLoan = !!transaction.loan_id;
  const amountColor = isLoan
    ? colors.loan
    : transaction.flow === 'IN'
    ? colors.income
    : colors.expense;
  const prefix = transaction.flow === 'IN' ? '+' : '−';

  const categoryName = category?.name ?? '...';
  const categoryColor = category?.color ?? colors.brandViolet;

  const rowContent = (
    <TouchableOpacity
      style={[styles.row, style]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <CategoryIcon name={categoryName} color={categoryColor} size={34} />

      <View style={styles.nameCol}>
        <View style={styles.nameRow}>
          {isLoan && (
            <Ionicons
              name="link-outline"
              size={10}
              color={colors.loan}
              style={styles.loanIcon}
            />
          )}
          <Text style={styles.categoryName} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>
        <Text style={styles.subtitle}>
          {formatTransactionDate(transaction.created_at)} · {transaction.method}
        </Text>
      </View>

      <View style={styles.amountCol}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {prefix} {transaction.currency} {formatAmount(transaction.amount)}
        </Text>
        <StatusBadge status={transaction.status} flow={transaction.flow} />
      </View>
    </TouchableOpacity>
  );

  const wrappedContent = (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'spring',
        delay: animationIndex * 50,
        damping: 22,
        stiffness: 320,
      }}
    >
      {rowContent}
    </MotiView>
  );

  if (onDelete || onEdit) {
    return (
      <SwipeableRow onDelete={onDelete ?? (() => {})} onEdit={onEdit ?? (() => {})}>
        {wrappedContent}
      </SwipeableRow>
    );
  }

  return wrappedContent;
}

const styles = StyleSheet.create({
  swipeContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  editBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#4F8EF7',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.expense,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 2,
  },
  actionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceCard,
    gap: 10,
  },
  nameCol: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loanIcon: {
    marginRight: 1,
  },
  categoryName: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: -0.3,
  },
});
