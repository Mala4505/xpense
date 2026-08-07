import { create } from 'zustand';

export type OverlayStep = 'amount' | 'category' | 'note';

interface OverlayState {
  isOpen: boolean;
  step: OverlayStep;
  isOverlayActivity: boolean;

  // Step 1: Amount
  flow: 'IN' | 'OUT';
  amount: string;

  // Step 2: Category
  selectedCategoryId?: string;
  personName?: string;
  presetCategoryId?: string;
  skipCategory: boolean;

  // Step 3: Note
  note: string;
}

interface OverlayStore extends OverlayState {
  openOverlay: () => void;
  openWithPreset: (categoryId: string, flow: 'IN' | 'OUT') => void;
  openLoanRepayment: (categoryId: string, flow: 'IN' | 'OUT', personName: string) => void;
  closeOverlay: () => void;
  resetOverlay: () => void;
  setOverlayActivityMode: (v: boolean) => void;

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
  isOverlayActivity: false,
  flow: 'OUT',
  amount: '',
  note: '',
  selectedCategoryId: undefined,
  personName: undefined,
  presetCategoryId: undefined,
  skipCategory: false,
};

export const useOverlayStore = create<OverlayStore>((set, get) => ({
  ...initialState,

  openOverlay: () => {
    set({ isOpen: true, step: 'amount' });
  },

  openWithPreset: (categoryId, flow) =>
    set({ isOpen: true, step: 'amount', flow, selectedCategoryId: categoryId, presetCategoryId: categoryId, skipCategory: true }),

  openLoanRepayment: (categoryId, flow, personName) =>
    set({
      isOpen: true,
      step: 'amount',
      flow,
      selectedCategoryId: categoryId,
      presetCategoryId: categoryId,
      personName,
      skipCategory: true,
    }),

  closeOverlay: () => {
    set({ isOpen: false });
  },

  resetOverlay: () => {
    set(initialState);
  },

  setOverlayActivityMode: (v) => set({ isOverlayActivity: v }),

  setFlow: (flow) => set({ flow }),
  setAmount: (amount) => set({ amount }),

  setSelectedCategory: (categoryId) => set({ selectedCategoryId: categoryId }),
  setPersonName: (name) => set({ personName: name }),

  setNote: (note) => set({ note }),

  nextStep: () => {
    const { step, skipCategory } = get();
    if (step === 'amount') set({ step: skipCategory ? 'note' : 'category' });
    else if (step === 'category') set({ step: 'note' });
  },

  previousStep: () => {
    const { step, skipCategory } = get();
    if (step === 'note') set({ step: skipCategory ? 'amount' : 'category' });
    else if (step === 'category') set({ step: 'amount' });
  },
}));
