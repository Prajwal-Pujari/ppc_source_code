import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  currentPageTitle: string;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  setPageTitle: (title: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  currentPageTitle: 'Dashboard',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  setPageTitle: (title) => set({ currentPageTitle: title }),
}));
