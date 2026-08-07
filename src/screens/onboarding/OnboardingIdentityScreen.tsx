import React, { useState, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useColors } from '../../theme/useColors';
import type { ColorScheme } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useSettingsStore } from '../../stores/settingsStore';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingIdentity'>;

function ProgressBars({ filled }: { filled: number }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: 6 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressBar,
            { backgroundColor: i < filled ? colors.brandNavy : colors.surfaceElevated },
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingIdentityScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const setUserName = useSettingsStore((s) => s.setUserName);
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);

  function handleContinue() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    navigation.navigate('OnboardingBackTap');
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.brandNavy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xpense</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <ProgressBars filled={2} />
        <Text style={styles.stepLabel}>STEP 2 OF 6</Text>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 60 }}
        >
          <Text style={styles.title}>What should we call you?</Text>
          <Text style={styles.subtitle}>Personalize your finance journey.</Text>
        </MotiView>

        {/* Glass-style input */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 120 }}
          style={styles.inputWrapOuter}
        >
          <View
            style={[
              styles.inputWrap,
              focused && styles.inputWrapFocused,
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={focused ? colors.brandNavy : colors.textDisabled}
            />
            <TextInput
              style={styles.input}
              placeholder="Preferred Name"
              placeholderTextColor={colors.textDisabled}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </MotiView>
      </View>

      {/* Pinned CTA */}
      <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.ctaButton, !name.trim() && styles.ctaDisabled]}
          onPress={handleContinue}
          activeOpacity={0.9}
          disabled={!name.trim()}
        >
          <Text style={styles.ctaText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.textOnYellow} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brandPale,
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.brandNavy,
    letterSpacing: -0.4,
  },
  headerSpacer: {
    width: 40,
  },

  // ── Content ───────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 30,
    color: colors.textPrimary,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 17,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: 32,
  },

  // ── Input ─────────────────────────────────────────────────────────────────
  inputWrapOuter: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  inputWrapFocused: {
    borderColor: colors.brandViolet,
  },
  input: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  bottomAction: {
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: colors.surfaceBg,
  },
  ctaButton: {
    backgroundColor: colors.brandYellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 100,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.textOnYellow,
  },
});
