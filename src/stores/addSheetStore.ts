import { create } from 'zustand';

interface AddSheetState {
  isOpen: boolean;
  editTransactionId: string | null;
  openSheet: (txId?: string) => void;
  closeSheet: () => void;
}

export const useAddSheetStore = create<AddSheetState>((set) => ({
  isOpen: false,
  editTransactionId: null,
  openSheet: (txId) => set({ isOpen: true, editTransactionId: txId ?? null }),
  closeSheet: () => set({ isOpen: false, editTransactionId: null }),
}));
