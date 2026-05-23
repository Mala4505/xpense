import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 0.0 = low sensitivity (requires hard tap), 1.0 = high (detects light tap)
export type BackTapSensitivity = number;
export type Theme = 'light' | 'dark';

interface SettingsStore {
  // Currency & Locale
  defaultCurrency: string;
  setDefaultCurrency: (currency: string) => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Back-Tap
  backTapEnabled: boolean;
  setBackTapEnabled: (enabled: boolean) => void;
  backTapSensitivity: BackTapSensitivity;
  setBackTapSensitivity: (sensitivity: BackTapSensitivity) => void;

  // Recent Categories for Quick Entry
  recentCategories: string[];
  addRecentCategory: (categoryId: string) => void;

  // App state
  hasSeededCategories: boolean;
  setHasSeededCategories: (value: boolean) => void;

  // Notifications
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;

  // Onboarding
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  userName: string;
  setUserName: (name: string) => void;
  pinnedCategoryNames: string[];
  setPinnedCategoryNames: (names: string[]) => void;

  // Budget Alerts
  budgetAlerts: {
    threshold1Enabled: boolean;
    threshold1Value: number;
    threshold2Enabled: boolean;
    threshold2Value: number;
    exceededEnabled: boolean;
    weeklyDigestEnabled: boolean;
  };
  setBudgetAlerts: (alerts: Partial<SettingsStore['budgetAlerts']>) => void;

  // Hydration guard (prevents flash of onboarding on returning users)
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      defaultCurrency: 'INR',
      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),

      theme: 'light',
      setTheme: (theme) => set({ theme }),

      backTapEnabled: true,
      setBackTapEnabled: (enabled) => set({ backTapEnabled: enabled }),
      backTapSensitivity: 0.5,
      setBackTapSensitivity: (sensitivity) => set({ backTapSensitivity: sensitivity }),

      recentCategories: [],
      addRecentCategory: (categoryId) =>
        set((state) => {
          const updated = [categoryId, ...state.recentCategories.filter((id) => id !== categoryId)];
          return { recentCategories: updated.slice(0, 3) };
        }),

      hasSeededCategories: false,
      setHasSeededCategories: (value) => set({ hasSeededCategories: value }),

      notificationsEnabled: true,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
      userName: '',
      setUserName: (name) => set({ userName: name }),
      pinnedCategoryNames: ['Salary', 'Investment', 'Daily Expenses', 'Grocery', 'Sadaqah'],
      setPinnedCategoryNames: (names) => set({ pinnedCategoryNames: names }),

      budgetAlerts: {
        threshold1Enabled: true,
        threshold1Value: 75,
        threshold2Enabled: true,
        threshold2Value: 90,
        exceededEnabled: true,
        weeklyDigestEnabled: true,
      },
      setBudgetAlerts: (alerts) =>
        set((s) => ({ budgetAlerts: { ...s.budgetAlerts, ...alerts } })),

      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'xpense-settings',
      version: 4,
      migrate: (state: any, version: number) => {
        if (version < 2) {
          const map: Record<string, number> = { low: 0.2, medium: 0.5, high: 0.8 };
          state.backTapSensitivity = map[state.backTapSensitivity] ?? 0.5;
        }
        if (version < 3) {
          state.budgetAlerts = {
            threshold1Enabled: true,
            threshold1Value: 75,
            threshold2Enabled: true,
            threshold2Value: 90,
            exceededEnabled: true,
            weeklyDigestEnabled: true,
          };
        }
        if (version < 4) {
          state.backTapEnabled = true;
        }
        return state;
      },
      storage: {
        getItem: async (name) => {
          const item = await AsyncStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
    }
  )
);
