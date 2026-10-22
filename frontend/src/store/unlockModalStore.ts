import { create } from 'zustand';

export interface UnlockModalData {
  opId: string;
  opName: string;
  serialNumber: string;
  slotNumber: number;
}

interface UnlockModalState {
  modalData: UnlockModalData | null;
  openModal: (data: UnlockModalData) => void;
  closeModal: () => void;
}

export const useUnlockModalStore = create<UnlockModalState>((set) => ({
  modalData: null,
  openModal: (data) => set({ modalData: data }),
  closeModal: () => set({ modalData: null }),
}));
