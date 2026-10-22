import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
  employeeCode: string;
  factoryId: string;
  mesEnabled?: boolean;
  pqcEnabled?: boolean;
  lpaEnabled?: boolean;
  canBackfillPqc?: boolean;
}

interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserInfo, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateAccessToken: (token: string) => void;
  updateUser: (fields: Partial<UserInfo>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
      updateAccessToken: (token) => set({ accessToken: token }),
      updateUser: (fields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...fields } : null,
        })),
    }),
    { name: 'mes-auth' }
  )
);
