import { create } from 'zustand';
import { authApi, tokenStorage } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  creditsBalance?: number;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  ready: boolean; // true once the initial session check has run
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone: string; password: string; country?: string }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setBalance: (balance: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  ready: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login(email, password);
      if (res.success && res.data) {
        tokenStorage.set(res.data.tokens.accessToken, res.data.tokens.refreshToken);
        set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      } else {
        throw new Error(res.error || res.message || 'Login failed');
      }
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed');
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authApi.register(data);
      if (res.success && res.data) {
        tokenStorage.set(res.data.tokens.accessToken, res.data.tokens.refreshToken);
        set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      } else {
        throw new Error(res.error || res.message || 'Registration failed');
      }
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(err.response?.data?.error || err.response?.data?.message || err.message || 'Registration failed');
    }
  },

  logout: () => {
    tokenStorage.clear();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    if (!tokenStorage.get()) {
      set({ ready: true, isAuthenticated: false });
      return;
    }
    try {
      const res = await authApi.me();
      const u = (res.data as any)?.type === 'user' ? (res.data as any).data : res.data;
      if (res.success && u) {
        set({ user: u, isAuthenticated: true, ready: true });
      } else {
        tokenStorage.clear();
        set({ isAuthenticated: false, ready: true });
      }
    } catch {
      tokenStorage.clear();
      set({ isAuthenticated: false, ready: true });
    }
  },

  setBalance: (balance) => set((s) => (s.user ? { user: { ...s.user, creditsBalance: balance } } : {})),
}));
