import * as SQLite from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDataRefreshStore } from '../stores/dataRefreshStore';

export function useLiveQuery<T>(
  sql: string,
  params: SQLite.SQLiteBindParams = []
): T[] {
  const db = useSQLiteContext();
  const key = useDataRefreshStore(s => s.key);
  const [data, setData] = useState<T[]>([]);
  const genRef = useRef(0);

  const run = useCallback(async () => {
    const gen = ++genRef.current;
    try {
      const rows = await db.getAllAsync<T>(sql, params);
      if (gen === genRef.current) setData(rows);
    } catch {
      // DB released or concurrent access; ignore stale result
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, sql, JSON.stringify(params)]);

  useEffect(() => {
    run();
  }, [run, key]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const subscription = SQLite.addDatabaseChangeListener(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(run, 150);
    });
    return () => {
      subscription.remove();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [run]);

  return data;
}
