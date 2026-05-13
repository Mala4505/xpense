import { create } from 'zustand';

type DataRefreshStore = { key: number; refresh: () => void };

export const useDataRefreshStore = create<DataRefreshStore>(set => ({
  key: 0,
  refresh: () => set(s => ({ key: s.key + 1 })),
}));
