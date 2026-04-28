import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

const SENSITIVITY_MAP = {
  low: 2.2,
  medium: 1.8,
  high: 1.5,
};

const TAP_WINDOW_MS = 400;
const COOLDOWN_MS = 1500;
const MIN_TAP_GAP_MS = 80;

export function useBackTap(onTripleTap: () => void) {
  const sensitivity = useSettingsStore((s) => s.backTapSensitivity);
  const tapsRef = useRef<number[]>([]);
  const lastTriggerRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const wasAboveRef = useRef<boolean>(false);
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const onTripleTapRef = useRef(onTripleTap);
  onTripleTapRef.current = onTripleTap;

  useEffect(() => {
    const threshold = SENSITIVITY_MAP[sensitivity];
    Accelerometer.setUpdateInterval(50);

    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      // Weight z-axis: back taps are primarily z-axis impacts
      const magnitude = Math.sqrt(x * x + y * y + z * z * 1.5);
      const now = Date.now();
      const isAbove = magnitude > threshold;

      // Rising-edge: only count the moment magnitude crosses threshold upward
      if (isAbove && !wasAboveRef.current) {
        wasAboveRef.current = true;

        if (now - lastTapTimeRef.current >= MIN_TAP_GAP_MS) {
          lastTapTimeRef.current = now;
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
