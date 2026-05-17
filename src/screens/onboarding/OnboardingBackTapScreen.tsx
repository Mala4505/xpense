import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingBackTap'>;

const TAP_THRESHOLD = 2.4;
const MIN_TAP_INTERVAL_MS = 280;

function ProgressBars({ filled }: { filled: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: 6 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressBar,
            { backgroundColor: i < filled ? colors.brandNavy : '#e9ddff' },
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingBackTapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  // Ripple animation
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0.5)).current;

  // Test state
  const [tapCount, setTapCount] = useState(0);
  const [testPassed, setTestPassed] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(rippleScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(rippleOpacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(rippleScale, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(rippleOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  useEffect(() => {
    let active = true;

    async function startListening() {
      const available = await Accelerometer.isAvailableAsync();
      if (!available || !active) return;

      Accelerometer.setUpdateInterval(40);
      subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
        if (!active) return;
        const mag = Math.sqrt(x * x + y * y + z * z);
        if (mag > TAP_THRESHOLD) {
          const now = Date.now();
          if (now - lastTapTimeRef.current > MIN_TAP_INTERVAL_MS) {
            lastTapTimeRef.current = now;
            tapCountRef.current += 1;
            const count = tapCountRef.current;
            setTapCount(count);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (count >= 3) {
              subscriptionRef.current?.remove();
              subscriptionRef.current = null;
              setTestPassed(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        }
      });
    }

    startListening();
    return () => {
      active = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);

  function handleNext() {
    navigation.navigate('OnboardingNotifications');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Top row: back + skip */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <ProgressBars filled={3} />
      <Text style={styles.stepLabel}>STEP 3 OF 6</Text>

      {/* Content */}
      <View style={styles.content}>
        {/* Phone illustration */}
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260, delay: 60 }}
          style={styles.illustrationWrap}
        >
          <View style={styles.bgGradientCircle} />
          <View style={styles.phone}>
            <Animated.View
              style={[
                styles.ripple,
                {
                  transform: [{ scale: Animated.multiply(rippleScale, new Animated.Value(2.5)) }],
                  opacity: rippleOpacity,
                },
              ]}
            />
            <View style={styles.rippleInner} />
            <Ionicons name="finger-print" size={32} color="white" style={styles.touchIcon} />
          </View>
        </MotiView>

        {/* Typography */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 140 }}
          style={styles.textBlock}
        >
          <Text style={styles.title}>Magic Shortcuts</Text>
          <Text style={styles.subtitle}>
            Triple-tap the back of your phone to instantly log an expense.
          </Text>
        </MotiView>

        {/* Test zone */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 220 }}
          style={styles.testCard}
        >
          {testPassed ? (
            <View style={styles.successRow}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={18} color="white" />
              </View>
              <Text style={styles.successText}>Back tap detected!</Text>
            </View>
          ) : (
            <>
              <Text style={styles.testPrompt}>
                {tapCount === 0
                  ? 'Now tap the back of your phone 3×'
                  : `${3 - tapCount} more tap${3 - tapCount !== 1 ? 's' : ''}…`}
              </Text>
              <View style={styles.tapDotsRow}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.tapDot, i < tapCount && styles.tapDotFilled]} />
                ))}
              </View>
            </>
          )}
        </MotiView>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaButton, !testPassed && styles.ctaDisabled]}
        onPress={testPassed ? handleNext : undefined}
        activeOpacity={0.9}
      >
        <Text style={styles.ctaText}>Next</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.brandNavy} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7ff',
    paddingHorizontal: 20,
  },

  // ── Top row ───────────────────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: '#797581',
  },

  // ── Progress ──────────────────────────────────────────────────────────────
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#797581',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  // ── Content ───────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationWrap: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  bgGradientCircle: {
    position: 'absolute',
    width: '80%',
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: '#eee4ff',
    opacity: 0.5,
  },
  phone: {
    width: 120,
    height: 240,
    backgroundColor: colors.brandNavy,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
    overflow: 'hidden',
  },
  ripple: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9B6EF0',
  },
  rippleInner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(155,110,240,0.5)',
  },
  touchIcon: {
    position: 'absolute',
    zIndex: 10,
  },

  // ── Text ──────────────────────────────────────────────────────────────────
  textBlock: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    color: colors.brandNavy,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: '#484550',
    lineHeight: 22,
    textAlign: 'center',
  },

  // ── Test card ─────────────────────────────────────────────────────────────
  testCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(200,192,248,0.3)',
  },
  testPrompt: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.brandNavy,
    textAlign: 'center',
  },
  tapDotsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tapDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d0c4f0',
    backgroundColor: 'transparent',
  },
  tapDotFilled: {
    backgroundColor: '#7042c3',
    borderColor: '#7042c3',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.income,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.income,
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  ctaButton: {
    backgroundColor: colors.brandYellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  ctaDisabled: {
    opacity: 0.35,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.brandNavy,
  },
});
