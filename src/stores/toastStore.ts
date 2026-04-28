import { create } from 'zustand';

interface ToastState {
  visible: boolean;
  message: string;
  subMessage: string;
  showToast: (message: string, subMessage: string) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  subMessage: '',
  showToast: (message, subMessage) => set({ visible: true, message, subMessage }),
  hideToast: () => set({ visible: false }),
}));
