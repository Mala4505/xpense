import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../theme/useColors';
import type { ColorScheme } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

interface NoteSuggestionsProps {
  suggestions: string[];
  currentValue: string;
  onSelect: (note: string) => void;
}

export function NoteSuggestions({ suggestions, currentValue, onSelect }: NoteSuggestionsProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const filtered = useMemo(() => {
    const q = currentValue.trim().toLowerCase();
    return suggestions.filter((s) => {
      if (s.toLowerCase() === q) return false;
      if (!q) return true;
      return s.toLowerCase().includes(q);
    });
  }, [suggestions, currentValue]);

  if (filtered.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}
    >
      {filtered.map((s) => (
        <TouchableOpacity
          key={s}
          style={styles.chip}
          onPress={() => onSelect(s)}
          activeOpacity={0.75}
        >
          <Ionicons name="time-outline" size={11} color={colors.brandPurple} />
          <Text style={styles.chipText} numberOfLines={1}>
            {s}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brandPale,
    borderRadius: 100,
    paddingHorizontal: 11,
    paddingVertical: 6,
    maxWidth: 160,
  },
  chipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.brandPurple,
  },
});
