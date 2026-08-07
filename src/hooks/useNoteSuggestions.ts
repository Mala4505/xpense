import { useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getTopNotesForCategory } from '../queries/transactions';

export function useNoteSuggestions(categoryId: string | null | undefined): string[] {
  const db = useSQLiteContext();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!categoryId) {
      setSuggestions([]);
      return;
    }
    let active = true;
    getTopNotesForCategory(db, categoryId).then((notes) => {
      if (active) setSuggestions(notes);
    });
    return () => {
      active = false;
    };
  }, [db, categoryId]);

  return suggestions;
}
