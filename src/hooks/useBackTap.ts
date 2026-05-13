import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

const SENSITIVITY_MAP = {
  low: 2.2,
  medium: 1.8,
  high: 1.5,
};

const TAP_WINDOW_MS  = 400;
const COOLDOWN_MS    = 1500;
const MIN_TAP_GAP_MS = 150;   // raised from 80 → 150ms
const QUIET_FLOOR    = 1.3;   // magnitude must drop below this between taps
const MIN_QUIET_MS   = 80;    // must stay quiet this long before next tap counts

export function useBackTap(onTripleTap: () => void) {
  const sensitivity = useSettingsStore((s) => s.backTapSensitivity);
  const tapsRef = useRef<number[]>([]);
  const lastTriggerRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const wasAboveRef = useRef<boolean>(false);
  const wasQuietRef = useRef<boolean>(true);   // phone starts at rest
  const lastWentQuietRef = useRef<number>(0);
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const onTripleTapRef = useRef(onTripleTap);
  onTripleTapRef.current = onTripleTap;

  useEffect(() => {
    const threshold = SENSITIVITY_MAP[sensitivity];
    Accelerometer.setUpdateInterval(50);

    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z * 1.5);
      const now = Date.now();
      const isAbove = magnitude > threshold;

      // Track when device returns to resting gravity between taps
      if (magnitude < QUIET_FLOOR) {
        if (!wasQuietRef.current) {
          wasQuietRef.current      = true;
          lastWentQuietRef.current = now;
        }
      }

      // Rising-edge: only count if device was genuinely quiet before this peak
      if (isAbove && !wasAboveRef.current) {
        wasAboveRef.current = true;
        const quietLongEnough =
          wasQuietRef.current && (now - lastWentQuietRef.current >= MIN_QUIET_MS);

        if (quietLongEnough && now - lastTapTimeRef.current >= MIN_TAP_GAP_MS) {
          lastTapTimeRef.current = now;
          wasQuietRef.current    = false;
          tapsRef.current = tapsRef.current.filter((t) => now - t < TAP_WINDOW_MS);
          tapsRef.current.push(now);

          if (tapsRef.current.length >= 3 && now - lastTriggerRef.current > COOLDOWN_MS) {
            lastTriggerRef.current = now;
            tapsRef.current = [];
            onTripleTapRef.current();
          }
        }
      } else if (!isAbove) {
        wasAboveRef.current = false;
      }
    });

    return () => {
      subscriptionRef.current?.remove();
    };
  }, [sensitivity]);
}
