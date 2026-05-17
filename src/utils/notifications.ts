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
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of allScheduled) {
      if (n.identifier === 'xpense-monthly-summary') {
        await Notifications.cancelScheduledNotificationAsync('xpense-monthly-summary');
        break;
      }
    }

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);

    const khumusNote =
      khumusDue > 0 ? ` · Khumus due: ${currency} ${formatAmount(khumusDue)}` : '';

    await Notifications.scheduleNotificationAsync({
      identifier: 'xpense-monthly-summary',
      content: {
        title: `${getMonthName(now)} Summary`,
        body:
          `Income: ${currency} ${formatAmount(incomeTotal)} · ` +
          `Expense: ${currency} ${formatAmount(expenseTotal)} · ` +
          `Net: ${currency} ${formatAmount(netBalance)}${khumusNote}`,
        data: { type: 'monthly_summary' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextMonth },
    });
  } catch {
    // Silently fail — notifications are non-critical
  }
}

export async function scheduleWeeklyDigest(
  lastWeekSpend: number,
  topCategory: string,
  projectedMonthEnd: number,
  onTrack: boolean,
  currency: string
): Promise<void> {
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of allScheduled) {
      if (n.identifier === 'xpense-weekly-digest') {
        await Notifications.cancelScheduledNotificationAsync('xpense-weekly-digest');
        break;
      }
    }

    // Next Monday at 9am
    const now = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);

    const trackStatus = onTrack ? 'on track' : 'over pace';
    const body =
      `Last week: ${currency} ${formatAmount(lastWeekSpend)} · ` +
      `Top: ${topCategory} · ` +
      `Month-end projection: ${currency} ${formatAmount(projectedMonthEnd)} · ${trackStatus}`;

    await Notifications.scheduleNotificationAsync({
      identifier: 'xpense-weekly-digest',
      content: {
        title: 'Weekly Budget Digest',
        body,
        data: { type: 'budget_digest' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextMonday },
    });
  } catch {
    // Silently fail
  }
}
