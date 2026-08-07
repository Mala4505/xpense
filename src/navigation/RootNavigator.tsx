import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import KhumusScreen from '../screens/KhumusScreen';
import LoansScreen from '../screens/LoansScreen';
import PendingScreen from '../screens/PendingScreen';
import AddScreen from '../screens/AddScreen';
import CategoryManagementScreen from '../screens/CategoryManagementScreen';
import OnboardingWelcomeScreen from '../screens/onboarding/OnboardingWelcomeScreen';
import OnboardingIdentityScreen from '../screens/onboarding/OnboardingIdentityScreen';
import OnboardingBackTapScreen from '../screens/onboarding/OnboardingBackTapScreen';
import OnboardingNotificationsScreen from '../screens/onboarding/OnboardingNotificationsScreen';
import OnboardingCategorySetupScreen from '../screens/onboarding/OnboardingCategorySetupScreen';
import OnboardingLaunchpadScreen from '../screens/onboarding/OnboardingLaunchpadScreen';
import { useSettingsStore } from '../stores/settingsStore';
import { useColors } from '../theme/useColors';

export type RootStackParamList = {
  // Onboarding
  OnboardingWelcome: undefined;
  OnboardingIdentity: undefined;
  OnboardingBackTap: undefined;
  OnboardingNotifications: undefined;
  OnboardingCategorySetup: undefined;
  OnboardingLaunchpad: undefined;
  // Main app
  MainTabs: undefined;
  Add: undefined;
  Khumus: undefined;
  Loans: undefined;
  Pending: undefined;
  CategoryManagement: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const colors = useColors();
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const userName = useSettingsStore((s) => s.userName);
  const pinnedCategoryNames = useSettingsStore((s) => s.pinnedCategoryNames);
  const _hasHydrated = useSettingsStore((s) => s._hasHydrated);

  // Wait for AsyncStorage hydration to avoid flashing onboarding on returning users
  if (!_hasHydrated) return <View style={{ flex: 1, backgroundColor: colors.surfaceBg }} />;

  // Show onboarding when not completed, or if both name and categories are missing (edge-case recovery)
  const shouldShowOnboarding =
    !hasCompletedOnboarding || (!userName.trim() && pinnedCategoryNames.length === 0);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.surfaceBg },
      }}
    >
      {shouldShowOnboarding ? (
        <>
          <Stack.Screen
            name="OnboardingWelcome"
            component={OnboardingWelcomeScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen name="OnboardingIdentity" component={OnboardingIdentityScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="OnboardingBackTap" component={OnboardingBackTapScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="OnboardingNotifications" component={OnboardingNotificationsScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="OnboardingCategorySetup" component={OnboardingCategorySetupScreen} options={{ animation: 'fade' }} />
          <Stack.Screen
            name="OnboardingLaunchpad"
            component={OnboardingLaunchpadScreen}
            options={{ gestureEnabled: false }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
          <Stack.Screen
            name="Add"
            component={AddScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="Khumus"
            component={KhumusScreen}
            options={{ animation: 'fade', animationTypeForReplace: 'pop' }}
          />
          <Stack.Screen
            name="Loans"
            component={LoansScreen}
            options={{ animation: 'fade', animationTypeForReplace: 'pop' }}
          />
          <Stack.Screen
            name="Pending"
            component={PendingScreen}
            options={{ animation: 'fade', animationTypeForReplace: 'pop' }}
          />
          <Stack.Screen
            name="CategoryManagement"
            component={CategoryManagementScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
