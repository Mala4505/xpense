import { create } from 'zustand';

export type ToastVariant = 'success' | 'error';

interface ToastState {
  visible: boolean;
  message: string;
  subMessage: string;
  variant: ToastVariant;
  toastId: number;
  showToast: (message: string, subMessage: string, variant?: ToastVariant) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  subMessage: '',
  variant: 'success',
  toastId: 0,
  showToast: (message, subMessage, variant = 'success') =>
    set((s) => ({ visible: true, message, subMessage, variant, toastId: s.toastId + 1 })),
  hideToast: () => set({ visible: false }),
}));
