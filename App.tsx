import 'react-native-reanimated';
import React, { Suspense, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';
import { StatusBar } from 'expo-status-bar';
import { View, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import RootNavigator from './src/navigation/RootNavigator';
import { fonts } from './src/theme';
import { onInit } from './src/db/database';
import { useOverlayStore } from './src/stores/overlayStore';
import { useBackTap } from './src/hooks/useBackTap';
import { QuickEntryOverlay } from './src/components/overlay/QuickEntryOverlay';
import { Toast } from './src/components/ui/Toast';
import {
  requestNotificationPermissions,
  scheduleMonthlySummary,
} from './src/utils/notifications';
import { useSettingsStore } from './src/stores/settingsStore';
import { getStartOfMonth, getEndOfMonth } from './src/utils/date';

SplashScreen.preventAutoHideAsync();

function AppContent({ fontsLoaded }: { fontsLoaded: boolean }) {
  const db = useSQLiteContext();
  const openOverlay = useOverlayStore((s) => s.openOverlay);
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);

  useBackTap(openOverlay);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    if (!notificationsEnabled) return;
    let cancelled = false;
    (async () => {
      const granted = await requestNotificationPermissions();
      if (!granted || cancelled) return;
      const start = getStartOfMonth();
      const end = getEndOfMonth();
      const [incomeRows, expenseRows, netRows, khumusRows] = await Promise.all([
        db.getAllAsync<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE flow = 'IN' AND created_at >= ? AND created_at <= ?`,
          [start, end]
        ),
        db.getAllAsync<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE flow = 'OUT' AND created_at >= ? AND created_at <= ?`,
          [start, end]
        ),
        db.getAllAsync<{ net: number }>(
          `SELECT COALESCE(SUM(CASE WHEN flow='IN' THEN amount ELSE -amount END), 0) AS net FROM transactions`
        ),
        db.getAllAsync<{ accumulated: number; paid: number }>(
          `SELECT
             COALESCE((SELECT SUM(khumus_share) FROM transactions WHERE flow='IN' AND khumus_share IS NOT NULL), 0) AS accumulated,
             COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.flow='OUT'
               AND t.category_id=(SELECT id FROM categories WHERE name='Khumus Paid' LIMIT 1)), 0) AS paid`
        ),
      ]);
      if (cancelled) return;
      const accumulated = khumusRows[0]?.accumulated ?? 0;
      const paid = khumusRows[0]?.paid ?? 0;
      await scheduleMonthlySummary(
        incomeRows[0]?.total ?? 0,
        expenseRows[0]?.total ?? 0,
        netRows[0]?.net ?? 0,
        Math.max(0, accumulated - paid),
        currency
      );
    })();
    return () => { cancelled = true; };
  }, [notificationsEnabled, currency, db]);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (url === 'xpense://overlay') {
        useOverlayStore.getState().openOverlay();
      }
    };
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <QuickEntryOverlay />
      <Toast />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          [fonts.sans]: PlusJakartaSans_400Regular,
          [fonts.sansMedium]: PlusJakartaSans_500Medium,
          [fonts.sansBold]: PlusJakartaSans_700Bold,
          [fonts.mono]: SpaceMono_400Regular,
          [fonts.monoBold]: SpaceMono_700Bold,
        });
      } catch (error) {
        console.error('Font load error:', error);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="transparent" translucent={false} />
        <SQLiteProvider databaseName="xpense.db" onInit={onInit} useSuspense>
          <Suspense fallback={null}>
            <AppContent fontsLoaded={fontsLoaded} />
          </Suspense>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
