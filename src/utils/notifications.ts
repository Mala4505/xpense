import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatAmount } from './currency';
import { getMonthName } from './date';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleMonthlySummary(
  incomeTotal: number,
  expenseTotal: number,
  netBalance: number,
  khumusDue: number,
  currency: string
): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);

    const khumusNote =
      khumusDue > 0 ? ` · Khumus due: ${currency} ${formatAmount(khumusDue)}` : '';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${getMonthName(now)} Summary`,
        body:
          `Income: ${currency} ${formatAmount(incomeTotal)} · ` +
          `Expense: ${currency} ${formatAmount(expenseTotal)} · ` +
          `Net: ${currency} ${formatAmount(netBalance)}${khumusNote}`,
        data: { type: 'monthly_summary' },
      },
      trigger: { date: nextMonth },
    });
  } catch {
    // Silently fail — notifications are non-critical
  }
}
