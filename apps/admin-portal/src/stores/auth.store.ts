import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';

interface Admin {
  id: string;
  email: string;
  name?: string;           // full name (from backend Admin model)
  firstName?: string;
  lastName?: string;
  role: 'super_admin' | 'admin' | 'support' | 'sub_admin';
  permissions: string[];
}

interface AuthState {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (admin: Admin, token: string, refreshToken?: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (admin: Admin, token: string, refreshToken?: string) => {
        Cookies.set('admin_token', token, { expires: 1 });
        if (refreshToken) Cookies.set('admin_refresh_token', refreshToken, { expires: 7 });
        set({ admin, token, isAuthenticated: true });
      },

      logout: () => {
        Cookies.remove('admin_token');
        Cookies.remove('admin_refresh_token');
        set({ admin: null, token: null, isAuthenticated: false });
      },

      hasPermission: (permission: string) => {
        const { admin } = get();
        if (!admin) return false;
        if (admin.role === 'super_admin') return true;
        return admin.permissions.includes(permission);
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        admin: state.admin,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
