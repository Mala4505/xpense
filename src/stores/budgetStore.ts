import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  differenceInCalendarDays,
  differenceInDays,
  getDaysInMonth,
  startOfMonth,
} from 'date-fns';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getBudgets, upsertBudget, deleteBudget } from '../queries/budgets';
import { useSettingsStore } from './settingsStore';
import { useNotificationsStore } from './notificationsStore';
import * as Notifications from 'expo-notifications';

export interface BudgetEntry {
  id: string;
  categoryId: string | null;
  amountLimit: number;
  amountSpent: number;
  percentUsed: number;
  currency: string;
}

interface LastAlertFired {
  t1?: number;
  t2?: number;
  exceeded?: number;
}

const ALERT_STORAGE_KEY = 'xpense-budget-alerts';

interface BudgetStore {
  budgets: BudgetEntry[];
  weeklyPace: number;
  projectedMonthEnd: number;
  lastAlertFired: Record<string, LastAlertFired>;
  _db: SQLiteDatabase | null;

  init: (db: SQLiteDatabase) => void;
  refresh: (month?: Date) => Promise<void>;
  setBudget: (categoryId: string | null, limit: number) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  checkAlerts: () => void;
  _loadAlertState: () => Promise<void>;
  _saveAlertState: (state: Record<string, LastAlertFired>) => Promise<void>;
}

function computeWeeklyPace(totalSpent: number): { weeklyPace: number; projectedMonthEnd: number } {
  const now = new Date();
  const daysElapsed = differenceInDays(now, startOfMonth(now)) + 1;
  const totalDays = getDaysInMonth(now);
  const dailyRate = totalSpent / daysElapsed;
  return {
    weeklyPace: dailyRate * 7,
    projectedMonthEnd: dailyRate * totalDays,
  };
}

export const useBudgetStore = create<BudgetStore>()((set, get) => ({
  budgets: [],
  weeklyPace: 0,
  projectedMonthEnd: 0,
  lastAlertFired: {},
  _db: null,

  init(db) {
    set({ _db: db });
    get()._loadAlertState().then(() => get().refresh());
  },

  async refresh(month = new Date()) {
    const db = get()._db;
    if (!db) return;

    const rows = await getBudgets(db, month);
    const entries: BudgetEntry[] = rows.map((r) => ({
      id: r.id,
      categoryId: r.category_id,
      amountLimit: r.amount_limit,
      amountSpent: r.amount_spent,
      percentUsed: r.amount_limit > 0 ? (r.amount_spent / r.amount_limit) * 100 : 0,
      currency: r.currency,
    }));

    const overall = entries.find((e) => e.categoryId === null);
    const totalSpent = overall?.amountSpent ?? 0;
    const { weeklyPace, projectedMonthEnd } = computeWeeklyPace(totalSpent);

    set({ budgets: entries, weeklyPace, projectedMonthEnd });
  },

  async setBudget(categoryId, limit) {
    const db = get()._db;
    if (!db) return;
    const { defaultCurrency } = useSettingsStore.getState();
    await upsertBudget(db, categoryId, limit, defaultCurrency, new Date());
    await get().refresh();
  },

  async removeBudget(id) {
    const db = get()._db;
    if (!db) return;
    await deleteBudget(db, id);
    await get().refresh();
  },

  checkAlerts() {
    const { budgets, lastAlertFired } = get();
    const { budgetAlerts, notificationsEnabled } = useSettingsStore.getState();
    if (!notificationsEnabled) return;

    const addNotification = useNotificationsStore.getState().addNotification;
    const now = new Date();
    const nowMs = now.getTime();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const updated: Record<string, LastAlertFired> = { ...lastAlertFired };

    for (const budget of budgets) {
      const fired = updated[budget.id] ?? {};
      const label = budget.categoryId === null ? 'Overall Budget' : `Budget`;

      // Early warning (threshold1)
      if (
        budgetAlerts.threshold1Enabled &&
        budget.percentUsed >= budgetAlerts.threshold1Value &&
        budget.percentUsed < budgetAlerts.threshold2Value
      ) {
        const firedMonth = fired.t1
          ? `${new Date(fired.t1).getFullYear()}-${String(new Date(fired.t1).getMonth() + 1).padStart(2, '0')}`
          : null;
        if (firedMonth !== currentMonth) {
          const title = `${label} Early Warning`;
          const body = `You've used ${Math.round(budget.percentUsed)}% of your ${budget.currency} ${budget.amountLimit.toLocaleString()} budget.`;
          addNotification({ type: 'budget', title, body });
          Notifications.scheduleNotificationAsync({
            content: { title, body, data: { type: 'budget', budgetId: budget.id } },
            trigger: null,
          }).catch(() => {});
          fired.t1 = nowMs;
        }
      }

      // Final warning (threshold2)
      if (
        budgetAlerts.threshold2Enabled &&
        budget.percentUsed >= budgetAlerts.threshold2Value &&
        budget.percentUsed < 100
      ) {
        const firedMonth = fired.t2
          ? `${new Date(fired.t2).getFullYear()}-${String(new Date(fired.t2).getMonth() + 1).padStart(2, '0')}`
          : null;
        if (firedMonth !== currentMonth) {
          const title = `${label} Final Warning`;
          const body = `You've used ${Math.round(budget.percentUsed)}% — approaching your ${budget.currency} ${budget.amountLimit.toLocaleString()} limit.`;
          addNotification({ type: 'budget', title, body });
          Notifications.scheduleNotificationAsync({
            content: { title, body, data: { type: 'budget', budgetId: budget.id } },
            trigger: null,
          }).catch(() => {});
          fired.t2 = nowMs;
        }
      }

      // Limit exceeded
      if (budgetAlerts.exceededEnabled && budget.percentUsed >= 100) {
        const daysSinceFired = fired.exceeded
          ? differenceInCalendarDays(now, new Date(fired.exceeded))
          : Infinity;
        if (daysSinceFired >= 1) {
          const title = `${label} Exceeded`;
          const body = `You've exceeded your ${budget.currency} ${budget.amountLimit.toLocaleString()} budget (${Math.round(budget.percentUsed)}% used).`;
          addNotification({ type: 'budget', title, body });
          Notifications.scheduleNotificationAsync({
            content: { title, body, data: { type: 'budget', budgetId: budget.id } },
            trigger: null,
          }).catch(() => {});
          fired.exceeded = nowMs;
        }
      }

      updated[budget.id] = fired;
    }

    set({ lastAlertFired: updated });
    get()._saveAlertState(updated);
  },

  async _loadAlertState() {
    try {
      const raw = await AsyncStorage.getItem(ALERT_STORAGE_KEY);
      if (raw) set({ lastAlertFired: JSON.parse(raw) });
    } catch {}
  },

  async _saveAlertState(state) {
    try {
      await AsyncStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(state));
    } catch {}
  },
}));
