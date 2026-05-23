import React, { Suspense, useEffect, useRef } from 'react';
import { NativeModules } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { QuickEntryOverlay } from './components/overlay/QuickEntryOverlay';
import { Toast } from './components/ui/Toast';
import { useOverlayStore } from './stores/overlayStore';

export function OverlayApp() {
  const isOpen = useOverlayStore((s) => s.isOpen);
  const hasOpened = useRef(false);

  useEffect(() => {
    useOverlayStore.getState().setOverlayActivityMode(true);
    useOverlayStore.getState().openOverlay();
    return () => {
      useOverlayStore.getState().closeOverlay();
      useOverlayStore.getState().setOverlayActivityMode(false);
    };
  }, []);

  useEffect(() => {
    if (isOpen) { hasOpened.current = true; return; }
    // Delay finish to let pending DB operations and close animation complete
    if (hasOpened.current) setTimeout(() => NativeModules.ActivityFinish?.finish?.(), 350);
  }, [isOpen]);

  return (
    <Suspense fallback={null}>
      <SQLiteProvider databaseName="xpense.db" useSuspense>
        <QuickEntryOverlay />
        <Toast />
      </SQLiteProvider>
    </Suspense>
  );
}
