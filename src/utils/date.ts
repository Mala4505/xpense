import { format, isToday, isYesterday, formatDistance, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export function formatTransactionDate(timestamp: number): string {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return format(date, 'MMM dd, yyyy');
}

export function formatTransactionTime(timestamp: number): string {
  return format(new Date(timestamp), 'h:mm a');
}

export function formatFullDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const dateStr = formatTransactionDate(timestamp);
  const timeStr = formatTransactionTime(timestamp);
  return `${dateStr}, ${timeStr}`;
}

export function getMonthName(date: Date): string {
  return format(date, 'MMMM');
}

export function getMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy');
}

export function getRelativeTime(timestamp: number): string {
  return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
}

export function getStartOfMonth(): number {
  return startOfDay(startOfMonth(new Date())).getTime();
}

export function getEndOfMonth(): number {
  return endOfDay(endOfMonth(new Date())).getTime();
}

export function getDateRangeTimestamps(
  rangeType: 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'allTime'
): { start: number; end: number } {
  const now = new Date();
  const today = startOfDay(now);

  switch (rangeType) {
    case 'today':
      return {
        start: today.getTime(),
        end: endOfDay(today).getTime(),
      };

    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return {
        start: startOfDay(weekStart).getTime(),
        end: endOfDay(now).getTime(),
      };
    }

    case 'month':
      return {
        start: startOfDay(startOfMonth(now)).getTime(),
        end: endOfDay(now).getTime(),
      };

    case 'lastMonth': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      return {
        start: startOfDay(startOfMonth(lastMonth)).getTime(),
        end: endOfDay(endOfMonth(lastMonth)).getTime(),
      };
    }

    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return {
        start: startOfDay(yearStart).getTime(),
        end: endOfDay(now).getTime(),
      };
    }

    case 'allTime':
    default:
      return {
        start: 0,
        end: endOfDay(now).getTime(),
      };
  }
}

export function groupTransactionsByDate(
  transactions: Array<{ created_at: number; [key: string]: any }>
): Record<string, typeof transactions> {
  const grouped: Record<string, typeof transactions> = {};

  for (const transaction of transactions) {
    const dateKey = formatTransactionDate(transaction.created_at);

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(transaction);
  }

  return grouped;
}
