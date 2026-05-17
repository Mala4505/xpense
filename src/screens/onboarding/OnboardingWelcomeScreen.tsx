import React from 'react';
import {
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
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingWelcome'>;

export default function OnboardingWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Hero Illustration */}
      <MotiView
        from={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260, delay: 60 }}
        style={styles.heroCard}
      >
        {/* Background circle decorations */}
        <View style={styles.bgCircleLarge} />
        <View style={styles.bgCircleMedium} />
        <View style={styles.coinLarge} />
        <View style={styles.coinSmall} />
        <View style={styles.greenDot} />
        <View style={styles.purpleDot} />

        {/* Center icon */}
        <View style={styles.centerIconWrap}>
          <Ionicons name="trending-up" size={64} color={colors.brandYellow} />
        </View>

        {/* Cash icon accent */}
        <View style={styles.cashIconWrap}>
          <Ionicons name="cash" size={28} color={colors.income} />
        </View>

        {/* Floating growth chip */}
        <View style={styles.growthChip}>
          <View style={styles.growthIconCircle}>
            <Ionicons name="trending-up" size={16} color="white" />
          </View>
          <View>
            <Text style={styles.growthLabel}>GROWTH</Text>
            <Text style={styles.growthAmount}>+14.2%</Text>
          </View>
        </View>
      </MotiView>

      {/* Text block */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260, delay: 140 }}
        style={styles.textBlock}
      >
        <Text style={styles.title}>Master Your Money</Text>
        <Text style={styles.subtitle}>
          Track, save, and grow with a calmer approach to finance.
        </Text>
      </MotiView>

      {/* CTA */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260, delay: 220 }}
        style={styles.actionArea}
      >
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('OnboardingIdentity')}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.brandNavy} />
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 20,
  },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 32,
    marginTop: 16,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgCircleLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.brandNavy,
    top: '15%',
    left: '10%',
    opacity: 0.07,
  },
  bgCircleMedium: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.brandPurple,
    bottom: '20%',
    right: '10%',
    opacity: 0.07,
  },
  coinLarge: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandYellow,
    top: '12%',
    right: '18%',
    opacity: 0.85,
  },
  coinSmall: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandYellow,
    top: '22%',
    left: '16%',
    opacity: 0.6,
  },
  greenDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.income,
    bottom: '28%',
    left: '14%',
    opacity: 0.7,
  },
  purpleDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brandPurple,
    top: '35%',
    right: '12%',
    opacity: 0.5,
  },
  centerIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.brandNavy,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  cashIconWrap: {
    position: 'absolute',
    bottom: '30%',
    right: '20%',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.incomeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  growthChip: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(200,192,248,0.3)',
  },
  growthIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#aa7dff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  growthLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: '#797581',
    letterSpacing: 0.8,
  },
  growthAmount: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.brandNavy,
    fontWeight: '700',
  },

  // ── Text block ────────────────────────────────────────────────────────────
  textBlock: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 30,
    color: colors.brandNavy,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: '#484550',
    lineHeight: 24,
    textAlign: 'center',
  },

  // ── Action area ───────────────────────────────────────────────────────────
  actionArea: {
    gap: 14,
    paddingBottom: 8,
  },
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
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.brandNavy,
  },
});
