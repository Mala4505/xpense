import { useCallback, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useLiveQuery } from './useLiveQuery';
import { useDataRefreshStore } from '../stores/dataRefreshStore';
import { RawTransaction } from '../db/types';

export type { RawTransaction } from '../db/types';

export function useRecentTransactions(limit = 5): RawTransaction[] {
  return useLiveQuery<RawTransaction>(
    `SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}

export function useAllTransactions(): RawTransaction[] {
  const db = useSQLiteContext();
  const key = useDataRefreshStore(s => s.key);
  const [data, setData] = useState<RawTransaction[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    db.getAllAsync<RawTransaction>(
      `SELECT * FROM transactions ORDER BY created_at DESC`
    ).then(rows => { if (active) setData(rows); });
    return () => { active = false; };
  }, [db, key]));
  return data;
}

export function usePendingTransactions(): RawTransaction[] {
  const db = useSQLiteContext();
  const key = useDataRefreshStore(s => s.key);
  const [data, setData] = useState<RawTransaction[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    db.getAllAsync<RawTransaction>(
      `SELECT * FROM transactions WHERE status IN ('pending', 'partial') ORDER BY created_at DESC`
    ).then(rows => { if (active) setData(rows); });
    return () => { active = false; };
  }, [db, key]));
  return data;
}

export function useKhumusPaidHistory(): RawTransaction[] {
  const db = useSQLiteContext();
  const key = useDataRefreshStore(s => s.key);
  const [data, setData] = useState<RawTransaction[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    db.getAllAsync<RawTransaction>(
      `SELECT t.* FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE c.name = 'Khumus Paid'
       ORDER BY t.created_at DESC`
    ).then(rows => { if (active) setData(rows); });
    return () => { active = false; };
  }, [db, key]));
  return data;
}
