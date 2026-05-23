import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useSettingsStore } from '../../stores/settingsStore';
import { requestNotificationPermissions } from '../../utils/notifications';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingNotifications'>;

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

export default function OnboardingNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const [requesting, setRequesting] = useState(false);

  async function handleAllow() {
    setRequesting(true);
    try {
      const granted = await requestNotificationPermissions();
      setNotificationsEnabled(granted);
    } catch {
      setNotificationsEnabled(false);
    } finally {
      setRequesting(false);
      navigation.navigate('OnboardingCategorySetup');
    }
  }

  function handleSkip() {
    setNotificationsEnabled(false);
    navigation.navigate('OnboardingCategorySetup');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Progress */}
      <View style={styles.progressWrap}>
        <ProgressBars filled={4} />
        <Text style={styles.stepLabel}>STEP 4 OF 6</Text>
      </View>

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Bell icon with glow */}
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 240, delay: 60 }}
          style={styles.glowWrap}
        >
          <View style={styles.glowBg} />
          <View style={styles.bellCircle}>
            <Ionicons name="notifications" size={64} color={colors.brandNavy} />
          </View>
        </MotiView>

        {/* Text */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 140 }}
          style={styles.textBlock}
        >
          <Text style={styles.title}>Never miss a beat</Text>
          <Text style={styles.subtitle}>
            Get smart alerts for your monthly budget and upcoming bills.
          </Text>
        </MotiView>
      </View>

      {/* Bottom actions */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 200 }}
        style={styles.actionArea}
      >
        <TouchableOpacity
          style={[styles.allowBtn, requesting && styles.btnDisabled]}
          onPress={handleAllow}
          activeOpacity={0.9}
          disabled={requesting}
        >
          {requesting ? (
            <ActivityIndicator size="small" color={colors.brandNavy} />
          ) : (
            <Text style={styles.allowText}>Allow Notifications</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Maybe later</Text>
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
  progressWrap: {
    paddingTop: 16,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
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
    marginTop: 8,
  },

  // ── Center content ────────────────────────────────────────────────────────
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 16,
  },
  glowWrap: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  glowBg: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#aa7dff',
    opacity: 0.18,
  },
  bellCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#eee4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 17,
    color: '#484550',
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 280,
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  actionArea: {
    gap: 4,
    paddingBottom: 8,
  },
  allowBtn: {
    backgroundColor: colors.brandYellow,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  allowText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.brandNavy,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  skipBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: '#797581',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
