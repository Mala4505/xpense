import * as SQLite from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, useEffect, useCallback, useRef } from 'react';

export function useLiveQuery<T>(
  sql: string,
  params: SQLite.SQLiteBindParams = []
): T[] {
  const db = useSQLiteContext();
  const [data, setData] = useState<T[]>([]);
  const isRunningRef = useRef(false);

  const run = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    try {
      const rows = await db.getAllAsync<T>(sql, params);
      setData(rows);
    } finally {
      isRunningRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, sql, JSON.stringify(params)]);

  useEffect(() => {
    run();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const subscription = SQLite.addDatabaseChangeListener(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { run(); }, 150);
    });
    return () => {
      subscription.remove();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [run]);

  return data;
}
