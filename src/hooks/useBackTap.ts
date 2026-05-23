import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

const TAP_WINDOW_MS  = 500;
const COOLDOWN_MS    = 1500;
const MIN_TAP_GAP_MS = 120;

// sensitivity: 0.0 = low (hard tap needed), 1.0 = high (light tap) → threshold in g-forces
function sensitivityToThreshold(s: number) {
  return 1.7 - s * 0.6;
}

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
    const threshold = sensitivityToThreshold(sensitivity);
    Accelerometer.setUpdateInterval(50);

    subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z * 1.5);
      const now = Date.now();
      const isAbove = magnitude > threshold;

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
