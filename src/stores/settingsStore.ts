import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BackTapSensitivity = 'low' | 'medium' | 'high';
export type Theme = 'light' | 'dark';

interface SettingsStore {
  // Currency & Locale
  defaultCurrency: string;
  setDefaultCurrency: (currency: string) => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Back-Tap Sensitivity
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
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      defaultCurrency: 'INR',
      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),

      theme: 'light',
      setTheme: (theme) => set({ theme }),

      backTapSensitivity: 'medium',
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
    }),
    {
      name: 'xpense-settings',
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
    }
  )
);
