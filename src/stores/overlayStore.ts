import { create } from 'zustand';

export type OverlayStep = 'amount' | 'category' | 'note';

interface OverlayState {
  isOpen: boolean;
  step: OverlayStep;

  // Step 1: Amount
  flow: 'IN' | 'OUT';
  amount: string;

  // Step 2: Category
  selectedCategoryId?: string;
  personName?: string;

  // Step 3: Note
  note: string;
}

interface OverlayStore extends OverlayState {
  openOverlay: () => void;
  closeOverlay: () => void;
  resetOverlay: () => void;

  // Amount step
  setFlow: (flow: 'IN' | 'OUT') => void;
  setAmount: (amount: string) => void;

  // Category step
  setSelectedCategory: (categoryId: string) => void;
  setPersonName: (name: string) => void;

  // Note step
  setNote: (note: string) => void;

  // Navigation
  nextStep: () => void;
  previousStep: () => void;
}

const initialState: OverlayState = {
  isOpen: false,
  step: 'amount',
  flow: 'OUT',
  amount: '',
  note: '',
};

export const useOverlayStore = create<OverlayStore>((set, get) => ({
  ...initialState,

  openOverlay: () => {
    set({ isOpen: true, step: 'amount' });
  },

  closeOverlay: () => {
    set({ isOpen: false });
  },

  resetOverlay: () => {
    set(initialState);
  },

  setFlow: (flow) => set({ flow }),
  setAmount: (amount) => set({ amount }),

  setSelectedCategory: (categoryId) => set({ selectedCategoryId: categoryId }),
  setPersonName: (name) => set({ personName: name }),

  setNote: (note) => set({ note }),

  nextStep: () => {
    const { step } = get();
    if (step === 'amount') {
      set({ step: 'category' });
    } else if (step === 'category') {
      set({ step: 'note' });
    }
  },

  previousStep: () => {
    const { step } = get();
    if (step === 'category') {
      set({ step: 'amount' });
    } else if (step === 'note') {
      set({ step: 'category' });
    }
  },
}));
