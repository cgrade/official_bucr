import { create } from 'zustand';
import { authApi, tokenStorage } from '../lib/api';
import { loadDisplayCurrency } from '../lib/currency';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  country?: string;
  creditsBalance: number;
  avatar?: string;
  referralCode?: string;
  reliabilityScore?: number;
  bookWithConfidence?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone: string; password: string; country?: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  refreshBalance: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login({ email, password });
      
      if (response.success && response.data) {
        await tokenStorage.setAccessToken(response.data.tokens.accessToken);
        await tokenStorage.setRefreshToken(response.data.tokens.refreshToken);
        
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
        loadDisplayCurrency(response.data.user?.country); // fire-and-forget
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || error.message || 'Login failed');
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await authApi.register(data);
      
      if (response.success && response.data) {
        await tokenStorage.setAccessToken(response.data.tokens.accessToken);
        await tokenStorage.setRefreshToken(response.data.tokens.refreshToken);
        
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
        loadDisplayCurrency(response.data.user?.country); // fire-and-forget
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || error.message || 'Registration failed');
    }
  },

  logout: async () => {
    await authApi.logout();
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await tokenStorage.getAccessToken();
      
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const response = await authApi.getProfile();
      
      if (response.success && response.data) {
        // Handle the nested data structure from /auth/me endpoint
        const userData = response.data.type === 'user' ? response.data.data : response.data;
        set({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
        });
        loadDisplayCurrency(userData?.country); // fire-and-forget

      } else {
        await tokenStorage.clearTokens();
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch {
      await tokenStorage.clearTokens();
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  updateUser: (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...userData } });
    }
  },

  refreshBalance: async () => {
    try {
      const response = await authApi.getProfile();
      if (response.success && response.data) {
        const userData = response.data.type === 'user' ? response.data.data : response.data;
        set((state) => ({
          user: state.user ? { ...state.user, creditsBalance: userData.creditsBalance } : null,
        }));
      }
    } catch {
      // Silently fail
    }
  },
}));
