import { useCallback, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import {
  subMonths, subDays, subWeeks,
  startOfMonth, endOfMonth, startOfDay, endOfDay, format,
} from 'date-fns';
import { useLiveQuery } from './useLiveQuery';
import { getStartOfMonth, getEndOfMonth } from '../utils/date';
import { useDataRefreshStore } from '../stores/dataRefreshStore';

// ─── Live (Home screen) ────────────────────────────────────────────────────

export function useNetBalance(): number {
  const rows = useLiveQuery<{ net: number }>(
    `SELECT COALESCE(SUM(CASE WHEN flow='IN' THEN amount ELSE -amount END), 0) AS net
     FROM transactions`
  );
  return rows[0]?.net ?? 0;
}

export function useIncomeTotal(): number {
  const start = getStartOfMonth();
  const end = getEndOfMonth();
  const rows = useLiveQuery<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
     WHERE flow = 'IN' AND created_at >= ? AND created_at <= ?`,
    [start, end]
  );
  return rows[0]?.total ?? 0;
}

export function useExpenseTotal(): number {
  const start = getStartOfMonth();
  const end = getEndOfMonth();
  const rows = useLiveQuery<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
     WHERE flow = 'OUT' AND created_at >= ? AND created_at <= ?`,
    [start, end]
  );
  return rows[0]?.total ?? 0;
}

export function usePendingCount(): number {
  const rows = useLiveQuery<{ count: number }>(
    `SELECT COUNT(*) AS count FROM transactions WHERE status IN ('pending', 'partial')`
  );
  return rows[0]?.count ?? 0;
}

export function usePendingTotal(): number {
  const rows = useLiveQuery<{ total: number }>(
    `SELECT COALESCE(SUM(amount - paid_amount), 0) AS total
     FROM transactions WHERE status IN ('pending', 'partial')`
  );
  return rows[0]?.total ?? 0;
}

export interface KhumusData {
  accumulated: number;
  paid: number;
  due: number;
}

export function useKhumusData(): KhumusData {
  const rows = useLiveQuery<{ accumulated: number; paid: number }>(
    `SELECT
       COALESCE((SELECT SUM(khumus_share) FROM transactions WHERE flow='IN' AND khumus_share IS NOT NULL), 0) AS accumulated,
       COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.flow='OUT'
         AND t.category_id=(SELECT id FROM categories WHERE name='Khumus Paid' LIMIT 1)), 0) AS paid`
  );
  const accumulated = rows[0]?.accumulated ?? 0;
  const paid = rows[0]?.paid ?? 0;
  return { accumulated, paid, due: Math.max(0, accumulated - paid) };
}

// ─── Focus-refresh (detail screens) ──────────────────────────────────────

export interface KhumusBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  total: number;
  khumusShare: number;
}

export function useKhumusBreakdown(): KhumusBreakdownItem[] {
  const db = useSQLiteContext();
  const key = useDataRefreshStore(s => s.key);
  const [data, setData] = useState<KhumusBreakdownItem[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    db.getAllAsync<{ category_id: string; category_name: string; category_color: string; total: number; khumus_share: number }>(
      `SELECT t.category_id, c.name AS category_name, c.color AS category_color,
         SUM(t.amount) AS total, SUM(t.khumus_share) AS khumus_share
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.flow = 'IN' AND t.khumus_share IS NOT NULL AND t.khumus_share > 0
       GROUP BY t.category_id ORDER BY total DESC`
    ).then(rows => {
      if (active) setData(rows.map(r => ({
        categoryId: r.category_id,
        categoryName: r.category_name,
        categoryColor: r.category_color,
        total: r.total,
        khumusShare: r.khumus_share,
      })));
    });
    return () => { active = false; };
  }, [db, key]));
  return data;
}

export interface MonthComparison {
  incomePct: number;
  expensePct: number;
}

export function useMonthComparison(): MonthComparison {
  const now = new Date();
  const thisStart = startOfDay(startOfMonth(now)).getTime();
  const thisEnd   = endOfDay(now).getTime();
  const lastStart = startOfDay(startOfMonth(subMonths(now, 1))).getTime();
  const lastEnd   = endOfDay(endOfMonth(subMonths(now, 1))).getTime();

  const rows = useLiveQuery<{ flow: string; total: number; period: string }>(
    `SELECT flow, SUM(amount) AS total,
       CASE WHEN created_at >= ? AND created_at <= ? THEN 'this' ELSE 'last' END AS period
     FROM transactions
     WHERE (created_at >= ? AND created_at <= ?) OR (created_at >= ? AND created_at <= ?)
     GROUP BY flow, period`,
    [thisStart, thisEnd, thisStart, thisEnd, lastStart, lastEnd]
  );

  const get = (f: string, p: string) =>
    rows.find(r => r.flow === f && r.period === p)?.total ?? 0;
  const [ti, li, te, le] = [get('IN', 'this'), get('IN', 'last'), get('OUT', 'this'), get('OUT', 'last')];
  return {
    incomePct:  li > 0 ? Math.round(((ti - li) / li) * 100) : 0,
    expensePct: le > 0 ? Math.round(((te - le) / le) * 100) : 0,
  };
}

export interface PeriodTotals {
  income: number;
  expense: number;
  net: number;
}

export function usePeriodTotals(start: number, end: number): PeriodTotals {
  const db = useSQLiteContext();
  const key = useDataRefreshStore(s => s.key);
  const [data, setData] = useState<PeriodTotals>({ income: 0, expense: 0, net: 0 });
  useFocusEffect(useCallback(() => {
    let active = true;
    db.getAllAsync<{ flow: string; total: number }>(
      `SELECT flow, COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE created_at >= ? AND created_at <= ? GROUP BY flow`,
      [start, end]
    ).then(rows => {
      if (!active) return;
      const income = rows.find(r => r.flow === 'IN')?.total ?? 0;
      const expense = rows.find(r => r.flow === 'OUT')?.total ?? 0;
      setData({ income, expense, net: income - expense });
    });
    return () => { active = false; };
  }, [db, start, end, key]));
  return data;
}

export type TimeRange = '1D' | '7D' | '1M' | '3M' | '1Y';

export interface TimeSeriesPoint {
  label: string;
  income: number;
  expense: number;
}

interface Bucket { start: number; end: number; label: string; }

function buildBuckets(range: TimeRange): Bucket[] {
  const now = new Date();
  const result: Bucket[] = [];
  switch (range) {
    case '1D': {
      const day = startOfDay(now);
      for (let h = 0; h < 24; h += 4) {
        const s = new Date(day.getTime() + h * 3_600_000);
        const e = new Date(s.getTime() + 4 * 3_600_000 - 1);
        result.push({ start: s.getTime(), end: e.getTime(), label: format(s, 'ha') });
      }
      break;
    }
    case '7D': {
      for (let d = 6; d >= 0; d--) {
        const day = subDays(startOfDay(now), d);
        result.push({ start: day.getTime(), end: endOfDay(day).getTime(), label: format(day, 'EEE') });
      }
      break;
    }
    case '1M': {
      for (let d = 29; d >= 0; d -= 3) {
        const day = subDays(startOfDay(now), d);
        result.push({
          start: day.getTime(),
          end: endOfDay(subDays(now, Math.max(0, d - 3))).getTime(),
          label: d % 9 === 0 || d === 29 || d === 0 ? format(day, 'd MMM') : '',
        });
      }
      break;
    }
    case '3M': {
      for (let w = 11; w >= 0; w--) {
        const weekStart = subWeeks(startOfDay(now), w + 1);
        const weekEnd = subWeeks(endOfDay(now), w);
        result.push({ start: weekStart.getTime(), end: weekEnd.getTime(), label: w % 4 === 0 ? format(weekEnd, 'MMM') : '' });
      }
      break;
    }
    case '1Y': {
      for (let m = 11; m >= 0; m--) {
        const month = subMonths(now, m);
        result.push({ start: startOfMonth(month).getTime(), end: endOfMonth(month).getTime(), label: format(month, 'MMM') });
      }
      break;
    }
  }
  return result;
}

export function useTimeSeriesData(range: TimeRange): TimeSeriesPoint[] {
  const db = useSQLiteContext();
  const key = useDataRefreshStore(s => s.key);
  const [allTxs, setAllTxs] = useState<{ created_at: number; flow: string; amount: number }[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    const buckets = buildBuckets(range);
    const rangeStart = buckets[0]?.start ?? 0;
    const rangeEnd = buckets[buckets.length - 1]?.end ?? Date.now();
    db.getAllAsync<{ created_at: number; flow: string; amount: number }>(
      `SELECT created_at, flow, amount FROM transactions WHERE created_at >= ? AND created_at <= ?`,
      [rangeStart, rangeEnd]
    ).then(rows => { if (active) setAllTxs(rows); });
    return () => { active = false; };
  }, [db, range, key]));
  return useMemo(() => {
    const buckets = buildBuckets(range);
    return buckets.map(b => {
      const bTxs = allTxs.filter(t => t.created_at >= b.start && t.created_at <= b.end);
      const income = bTxs.filter(t => t.flow === 'IN').reduce((s, t) => s + t.amount, 0);
      const expense = bTxs.filter(t => t.flow === 'OUT').reduce((s, t) => s + t.amount, 0);
      return { label: b.label, income, expense };
    });
  }, [allTxs, range]);
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  percentage: number;
}

export function useCategoryBreakdown(start: number, end: number): CategoryBreakdownItem[] {
  const db = useSQLiteContext();
  const key = useDataRefreshStore(s => s.key);
  const [data, setData] = useState<CategoryBreakdownItem[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    db.getAllAsync<{ category_id: string; category_name: string; category_color: string; amount: number }>(
      `SELECT t.category_id, c.name AS category_name, c.color AS category_color,
         SUM(t.amount) AS amount
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.flow = 'OUT' AND t.created_at >= ? AND t.created_at <= ?
       GROUP BY t.category_id ORDER BY amount DESC`,
      [start, end]
    ).then(rows => {
      if (!active) return;
      const total = rows.reduce((s, r) => s + r.amount, 0);
      setData(rows.map(r => ({
        categoryId: r.category_id,
        categoryName: r.category_name,
        categoryColor: r.category_color,
        amount: r.amount,
        percentage: total > 0 ? (r.amount / total) * 100 : 0,
      })));
    });
    return () => { active = false; };
  }, [db, start, end, key]));
  return data;
}
