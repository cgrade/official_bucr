import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';

interface Vendor {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  logo?: string;
  subscriptionTier: 'BASIC' | 'PRO' | 'PREMIUM' | 'basic' | 'pro' | 'elite';
  subscriptionExpiresAt?: string | null;
  venueType?: string;
  reliabilityScore?: number | null;
  bookWithConfidence?: boolean;
  isVerified: boolean;
  branches?: any[];
}

interface AuthState {
  vendor: Vendor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setVendor: (vendor: Vendor) => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      vendor: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(email, password);
          const { tokens, vendor } = response.data;
          
          // Store tokens
          Cookies.set('vendor_token', tokens.accessToken, { expires: 1 }); // 1 day
          Cookies.set('vendor_refresh_token', tokens.refreshToken, { expires: 7 }); // 7 days
          
          set({ 
            vendor: {
              id: vendor.id,
              businessName: vendor.businessName,
              email: response.data.user?.email || '',
              phone: response.data.user?.phone || '',
              subscriptionTier: vendor.subscriptionTier?.toUpperCase() || 'BASIC',
              isVerified: vendor.verificationStatus === 'approved',
              branches: vendor.branches,
            }, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          Cookies.remove('vendor_token');
          Cookies.remove('vendor_refresh_token');
          set({ vendor: null, isAuthenticated: false });
        }
      },

      setVendor: (vendor: Vendor) => {
        set({ vendor, isAuthenticated: true });
      },

      fetchProfile: async () => {
        set({ isLoading: true });
        try {
          const response = await authApi.getProfile();
          set({ vendor: response.data, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'bucr-vendor-auth',
      partialize: (state) => ({ vendor: state.vendor, isAuthenticated: state.isAuthenticated }),
    }
  )
);
