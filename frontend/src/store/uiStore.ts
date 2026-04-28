import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  currentPageTitle: string;
  toggleSidebar: () => void;
  setPageTitle: (title: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  currentPageTitle: 'Dashboard',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setPageTitle: (title) => set({ currentPageTitle: title }),
}));
