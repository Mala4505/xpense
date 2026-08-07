import { useSettingsStore } from '../stores/settingsStore';
import { lightColors, darkColors } from './colors';

export function useColors() {
  const theme = useSettingsStore((s) => s.theme);
  return theme === 'dark' ? darkColors : lightColors;
}

export function useThemeMode() {
  return useSettingsStore((s) => s.theme);
}
