import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useSettingsStore } from '../../stores/settingsStore';

// All 6 bars filled — onboarding complete
function ProgressBars() {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={styles.progressBar} />
      ))}
    </View>
  );
}

// Confetti dot component
function ConfettiDot({ color, style }: { color: string; style: object }) {
  return <View style={[styles.confettiDot, { backgroundColor: color }, style]} />;
}

export default function OnboardingLaunchpadScreen() {
  const insets = useSafeAreaInsets();
  const setHasCompletedOnboarding = useSettingsStore((s) => s.setHasCompletedOnboarding);
  const userName = useSettingsStore((s) => s.userName);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const displayName = userName.trim().split(' ')[0] || '';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 200 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  function handleStart() {
    setHasCompletedOnboarding(true);
    // RootNavigator automatically switches to MainTabs when hasCompletedOnboarding becomes true
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Progress */}
      <ProgressBars />

      {/* Hero area */}
      <View style={styles.heroArea}>
        {/* Celebration visual with confetti */}
        <Animated.View
          style={[styles.celebrationWrap, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        >
          {/* Glow */}
          <View style={styles.glowBg} />

          {/* Confetti dots */}
          <ConfettiDot color={colors.brandYellow} style={styles.confetti1} />
          <ConfettiDot color={colors.brandPurple} style={styles.confetti2} />
          <ConfettiDot color={colors.income} style={styles.confetti3} />
          <ConfettiDot color={colors.brandYellow} style={styles.confetti4} />
          <ConfettiDot color="#aa7dff" style={styles.confetti5} />
          <ConfettiDot color={colors.income} style={styles.confetti6} />

          {/* Center circle */}
          <View style={styles.centerCircle}>
            <Ionicons name="checkmark-circle" size={80} color={colors.brandNavy} />
          </View>
        </Animated.View>

        {/* Text */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 300 }}
          style={styles.textBlock}
        >
          <Text style={styles.title}>
            {displayName ? `You're all set, ${displayName}!` : "You're all set!"}
          </Text>
          <Text style={styles.subtitle}>Your financial journey starts now.</Text>
        </MotiView>
      </View>

      {/* CTA */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 450 }}
      >
        <TouchableOpacity style={styles.ctaButton} onPress={handleStart} activeOpacity={0.9}>
          <Text style={styles.ctaText}>Start budgeting</Text>
          <Ionicons name="arrow-forward" size={24} color={colors.brandNavy} />
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7ff',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },

  // ── Progress ──────────────────────────────────────────────────────────────
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 16,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brandNavy,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationWrap: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  glowBg: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#f3eaff',
    opacity: 0.6,
  },
  centerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
    borderWidth: 4,
    borderColor: 'white',
  },

  // Confetti
  confettiDot: {
    position: 'absolute',
    borderRadius: 4,
  },
  confetti1: { width: 16, height: 16, borderRadius: 8, top: 10, left: 40, transform: [{ rotate: '15deg' }] },
  confetti2: { width: 12, height: 12, borderRadius: 6, top: 20, right: 30 },
  confetti3: { width: 10, height: 20, borderRadius: 5, top: 40, right: 50, transform: [{ rotate: '30deg' }] },
  confetti4: { width: 14, height: 14, borderRadius: 7, bottom: 30, left: 35 },
  confetti5: { width: 18, height: 10, borderRadius: 5, bottom: 50, right: 40, transform: [{ rotate: '-20deg' }] },
  confetti6: { width: 10, height: 10, borderRadius: 5, bottom: 20, left: 80 },

  // ── Text ──────────────────────────────────────────────────────────────────
  textBlock: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 30,
    color: colors.textPrimary,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: '#484550',
    textAlign: 'center',
    maxWidth: 280,
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  ctaButton: {
    backgroundColor: colors.brandYellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    color: colors.brandNavy,
  },
});
