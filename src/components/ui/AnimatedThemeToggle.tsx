import React, { useEffect, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useColors, useThemeMode } from '../../theme/useColors';
import type { ColorScheme } from '../../theme/colors';
import { useSettingsStore } from '../../stores/settingsStore';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const SIZES = {
  sm: { box: 36, icon: 18 },
  md: { box: 44, icon: 20 },
} as const;

// Matches the reference component's `duration = 0.7`.
const DURATION = 700;

const CENTER = [12.4058, 12.7625];
const RAY_LENGTH = 2;
const CIRCLE_LENGTH = 2 * Math.PI * 5; // sun circle radius is 5
const MOON_LENGTH = 65; // approximate crescent stroke length

interface AnimatedThemeToggleProps {
  size?: keyof typeof SIZES;
}

export function AnimatedThemeToggle({ size = 'md' }: AnimatedThemeToggleProps) {
  const colors = useColors();
  const mode = useThemeMode();
  const setTheme = useSettingsStore((s) => s.setTheme);
  const isDark = mode === 'dark';
  const dims = SIZES[size];
  const styles = useMemo(() => createStyles(colors, dims), [colors, dims]);

  // 0 = fully light (sun), 1 = fully dark (moon) — one shared driver, like
  // the reference's `animate={isDark ? "checked" : "unchecked"}`.
  const progress = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isDark ? 1 : 0, {
      duration: DURATION,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [isDark, progress]);

  // Sun scales 1 -> 0, moon scales 0 -> 1 (mirror), both anchored at the
  // icon's center via `origin` so they scale in place, not from (0,0).
  const sunGroupProps = useAnimatedProps(() => ({ scale: 1 - progress.value }));
  const moonGroupProps = useAnimatedProps(() => ({ scale: progress.value }));

  // Each stroke only "draws in" over the last 40% of its own scale-in,
  // mirroring pathLength = useTransform(scale, [0.6, 1], [0, 1]).
  const rayProps = useAnimatedProps(() => ({
    strokeDashoffset: drawOffset(1 - progress.value, RAY_LENGTH),
  }));
  const circleProps = useAnimatedProps(() => ({
    strokeDashoffset: drawOffset(1 - progress.value, CIRCLE_LENGTH),
  }));
  const moonProps = useAnimatedProps(() => ({
    strokeDashoffset: drawOffset(progress.value, MOON_LENGTH),
  }));

  function handlePress() {
    Haptics.selectionAsync();
    setTheme(isDark ? 'light' : 'dark');
  }

  return (
    <TouchableOpacity
      style={styles.box}
      onPress={handlePress}
      activeOpacity={0.8}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
    >
      <Svg width={dims.icon} height={dims.icon} viewBox="0 0 25 25" fill="none">
        <AnimatedG origin={CENTER} animatedProps={sunGroupProps}>
          <AnimatedPath
            d="M12.4058 17.7625C15.1672 17.7625 17.4058 15.5239 17.4058 12.7625C17.4058 10.0011 15.1672 7.76251 12.4058 7.76251C9.64434 7.76251 7.40576 10.0011 7.40576 12.7625C7.40576 15.5239 9.64434 17.7625 12.4058 17.7625Z"
            stroke={colors.brandNavy}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CIRCLE_LENGTH}
            animatedProps={circleProps}
          />
          {RAYS.map((d) => (
            <AnimatedPath
              key={d}
              d={d}
              stroke={colors.brandNavy}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={RAY_LENGTH}
              animatedProps={rayProps}
            />
          ))}
        </AnimatedG>
        <AnimatedG origin={CENTER} animatedProps={moonGroupProps}>
          <AnimatedPath
            d="M21.1918 13.2013C21.0345 14.9035 20.3957 16.5257 19.35 17.8781C18.3044 19.2305 16.8953 20.2571 15.2875 20.8379C13.6797 21.4186 11.9398 21.5294 10.2713 21.1574C8.60281 20.7854 7.07479 19.9459 5.86602 18.7371C4.65725 17.5283 3.81774 16.0003 3.4457 14.3318C3.07367 12.6633 3.18451 10.9234 3.76526 9.31561C4.346 7.70783 5.37263 6.29868 6.72501 5.25307C8.07739 4.20746 9.69959 3.56862 11.4018 3.41132C10.4052 4.75958 9.92564 6.42077 10.0503 8.09273C10.175 9.76469 10.8957 11.3364 12.0812 12.5219C13.2667 13.7075 14.8384 14.4281 16.5104 14.5528C18.1823 14.6775 19.8435 14.1979 21.1918 13.2013Z"
            stroke={colors.brandYellow}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={MOON_LENGTH}
            animatedProps={moonProps}
          />
        </AnimatedG>
      </Svg>
    </TouchableOpacity>
  );
}

function drawOffset(localScale: number, length: number) {
  'worklet';
  const drawn = Math.max(0, Math.min(1, (localScale - 0.6) / 0.4));
  return length * (1 - drawn);
}

const RAYS = [
  'M12.4058 1.76251V3.76251',
  'M12.4058 21.7625V23.7625',
  'M4.62598 4.98248L6.04598 6.40248',
  'M18.7656 19.1225L20.1856 20.5425',
  'M1.40576 12.7625H3.40576',
  'M21.4058 12.7625H23.4058',
  'M4.62598 20.5425L6.04598 19.1225',
  'M18.7656 6.40248L20.1856 4.98248',
];

const createStyles = (colors: ColorScheme, dims: (typeof SIZES)[keyof typeof SIZES]) =>
  StyleSheet.create({
    box: {
      width: dims.box,
      height: dims.box,
      borderRadius: dims.box / 2,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
