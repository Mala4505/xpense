import { useCallback, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useLiveQuery } from './useLiveQuery';
import { RawCategory, EnrichedLoan } from '../db/types';

export type { RawCategory } from '../db/types';

export function useCategoriesMap(): Map<string, RawCategory> {
  const rows = useLiveQuery<RawCategory>(`SELECT * FROM categories`);
  return useMemo(() => new Map(rows.map(c => [c.id, c])), [rows]);
}

export function useCategories(): RawCategory[] {
  const db = useSQLiteContext();
  const [data, setData] = useState<RawCategory[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    db.getAllAsync<RawCategory>(
      `SELECT * FROM categories ORDER BY sort_order ASC`
    ).then(rows => { if (active) setData(rows); });
    return () => { active = false; };
  }, [db]));
  return data;
}

export function useLoans(): EnrichedLoan[] {
  const db = useSQLiteContext();
  const [data, setData] = useState<EnrichedLoan[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    db.getAllAsync<EnrichedLoan>(
      `SELECT l.*,
         COALESCE(SUM(t.paid_amount), 0) AS total_repaid,
         (l.principal - COALESCE(SUM(t.paid_amount), 0)) AS remaining
       FROM loans l
       LEFT JOIN transactions t ON t.loan_id = l.id AND t.status != 'cancelled'
       GROUP BY l.id
       ORDER BY l.created_at DESC`
    ).then(rows => { if (active) setData(rows); });
    return () => { active = false; };
  }, [db]));
  return data;
}
