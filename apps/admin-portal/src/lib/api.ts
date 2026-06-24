import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh: concurrent 401s share ONE refresh call (prevents races/loops).
let refreshPromise: Promise<string | null> | null = null;
function doRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    const refreshToken = Cookies.get('admin_refresh_token');
    refreshPromise = (refreshToken
      ? axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken })
          .then(({ data }) => {
            if (!data?.success) return null;
            const tokens = data.data.tokens ?? data.data;
            Cookies.set('admin_token', tokens.accessToken, { expires: 1 });
            if (tokens.refreshToken) Cookies.set('admin_refresh_token', tokens.refreshToken, { expires: 7 });
            return tokens.accessToken as string;
          })
          .catch(() => null)
      : Promise.resolve(null)
    ).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}
function hardLogout() {
  Cookies.remove('admin_token');
  Cookies.remove('admin_refresh_token');
  try { localStorage.removeItem('admin-auth-storage'); } catch {}
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

// Silently refresh the access token on 401 so admins aren't signed out after the
// 15-min access token expires; only log out if the refresh itself fails.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    // Only skip refresh for credential endpoints — NOT protected reads like /auth/admin/me.
    const skipRefresh = /\/auth\/(admin\/login|login|register|refresh)/.test(original?.url || '');

    if (error.response?.status === 401 && !skipRefresh && original && !original._retry) {
      original._retry = true;
      const newToken = await doRefresh();
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as any).Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      hardLogout();
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<ApiResponse<any>>('/auth/admin/login', { email, password });
    return data;
  },
  me: async () => {
    const { data } = await api.get<ApiResponse<any>>('/auth/admin/me');
    return data;
  },
  logout: async () => {
    const { data } = await api.post<ApiResponse<null>>('/auth/admin/logout');
    return data;
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async () => {
    const { data } = await api.get<ApiResponse<any>>('/admin/dashboard');
    return data;
  },
  getRecentActivity: async () => {
    const { data } = await api.get<ApiResponse<any>>('/admin/activity');
    return data;
  },
};

// Admins API (super_admin only)
export const adminsApi = {
  getAll: async () => {
    const { data } = await api.get<ApiResponse<any>>('/admin/admins');
    return data;
  },
  create: async (payload: { email: string; name: string; role: string; permissions?: string[]; password: string }) => {
    const { data } = await api.post<ApiResponse<any>>('/admin/admins', payload);
    return data;
  },
  update: async (id: string, payload: { role?: string; permissions?: string[]; password?: string }) => {
    const { data } = await api.patch<ApiResponse<any>>(`/admin/admins/${id}`, payload);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete<ApiResponse<null>>(`/admin/admins/${id}`);
    return data;
  },
};

// Broadcast API (admin → vendors)
export const broadcastApi = {
  send: async (payload: { subject: string; body: string; audience: 'all' | 'basic' | 'pro' | 'elite' }) => {
    const { data } = await api.post<ApiResponse<{ recipients: number }>>('/admin/broadcasts', payload);
    return data;
  },
};

// Reviews moderation API
export const reviewsApi = {
  getReported: async (params?: { page?: number; reported?: boolean }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/reviews', { params: { reported: params?.reported ?? true, page: params?.page ?? 1 } });
    return data;
  },
  moderate: async (id: string, action: 'hide' | 'restore' | 'dismiss') => {
    const { data } = await api.patch<ApiResponse<any>>(`/admin/reviews/${id}`, { action });
    return data;
  },
};

// Users API
export const usersApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/users', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/admin/users/${id}`);
    return data;
  },
  create: async (payload: { email: string; name: string; phone?: string; password: string; creditsBalance?: number }) => {
    const { data } = await api.post<ApiResponse<any>>('/admin/users', payload);
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data } = await api.patch<ApiResponse<any>>(`/admin/users/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete<ApiResponse<any>>(`/admin/users/${id}`);
    return data;
  },
  suspend: async (id: string, reason: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/admin/users/${id}/suspend`, { reason });
    return data;
  },
  activate: async (id: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/admin/users/${id}/activate`);
    return data;
  },
  adjustCredits: async (id: string, amount: number, reason: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/admin/users/${id}/credits`, { amount, reason });
    return data;
  },
};

// Vendors API
export const vendorsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string; tier?: string }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/vendors', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/admin/vendors/${id}`);
    return data;
  },
  create: async (payload: { 
    businessName: string; 
    email: string; 
    phone?: string; 
    ownerName: string; 
    ownerEmail: string; 
    ownerPassword: string;
    description?: string;
    cuisineTypes?: string[];
    subscriptionTier?: 'basic' | 'pro' | 'elite';
  }) => {
    const { data } = await api.post<ApiResponse<any>>('/admin/vendors', payload);
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data } = await api.patch<ApiResponse<any>>(`/admin/vendors/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete<ApiResponse<any>>(`/admin/vendors/${id}`);
    return data;
  },
  verify: async (id: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/admin/vendors/${id}/verify`);
    return data;
  },
  suspend: async (id: string, reason: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/admin/vendors/${id}/suspend`, { reason });
    return data;
  },
  activate: async (id: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/admin/vendors/${id}/activate`);
    return data;
  },
  adjustCredits: async (id: string, amount: number, reason: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/admin/vendors/${id}/credits`, { amount, reason });
    return data;
  },
};

// Credits API
export const creditsApi = {
  getStats: async () => {
    const { data } = await api.get<ApiResponse<any>>('/admin/credits/stats');
    return data;
  },
  getTransactions: async (params?: { page?: number; limit?: number; type?: string; userId?: string; vendorId?: string }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/credits/transactions', { params });
    return data;
  },
};

// Reservations API
export const reservationsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string; vendorId?: string }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/reservations', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/admin/reservations/${id}`);
    return data;
  },
  cancel: async (id: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/admin/reservations/${id}/cancel`);
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data } = await api.patch<ApiResponse<any>>(`/admin/reservations/${id}`, { status });
    return data;
  },
};

// Orders API
export const ordersApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; status?: string; type?: string; vendorId?: string }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/orders', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/admin/orders/${id}`);
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data } = await api.patch<ApiResponse<any>>(`/admin/orders/${id}`, { status });
    return data;
  },
};

// Analytics API
export const analyticsApi = {
  getOverview: async (params?: { period?: string }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/analytics', { params });
    return data;
  },
  getUserStats: async (params?: { period?: string }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/analytics/users', { params });
    return data;
  },
  getVendorStats: async (params?: { period?: string }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/analytics/vendors', { params });
    return data;
  },
  getRevenueStats: async (params?: { period?: string }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/analytics/revenue', { params });
    return data;
  },
};

// Settings API
export const settingsApi = {
  getAll: async () => {
    const { data } = await api.get<ApiResponse<any>>('/admin/settings');
    return data;
  },
  update: async (settings: Record<string, any>) => {
    const { data } = await api.patch<ApiResponse<any>>('/admin/settings', settings);
    return data;
  },
  get: async (key: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/admin/settings/${key}`);
    return data;
  },
};

// Documents API
export const documentsApi = {
  getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/documents', { params });
    return data;
  },
  getByVendor: async (vendorId: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/admin/vendors/${vendorId}/documents`);
    return data;
  },
  approve: async (id: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/admin/documents/${id}/verify`, { status: 'approved' });
    return data;
  },
  reject: async (id: string, reason: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/admin/documents/${id}/verify`, { status: 'rejected', rejectionReason: reason });
    return data;
  },
};

// Reports API
export const reportsApi = {
  generate: async (type: string, dateRange?: { start?: string; end?: string }) => {
    const { data } = await api.post<ApiResponse<any>>('/admin/reports/generate', { type, ...dateRange });
    return data;
  },
  getHistory: async () => {
    const { data } = await api.get<ApiResponse<any>>('/admin/reports/history');
    return data;
  },
};

// Featured API - Manage packages and spots
export const featuredApi = {
  // Packages
  getPackages: async (params?: { type?: string; activeOnly?: boolean }) => {
    const { data } = await api.get<ApiResponse<any[]>>('/admin/featured/packages', { params });
    return data;
  },
  getPackage: async (id: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/admin/featured/packages/${id}`);
    return data;
  },
  createPackage: async (payload: {
    name: string;
    type: 'restaurant' | 'experience' | 'offer';
    description?: string;
    creditsCost: number;
    durationDays: number;
    isActive?: boolean;
    sortOrder?: number;
  }) => {
    const { data } = await api.post<ApiResponse<any>>('/admin/featured/packages', payload);
    return data;
  },
  updatePackage: async (id: string, payload: any) => {
    const { data } = await api.patch<ApiResponse<any>>(`/admin/featured/packages/${id}`, payload);
    return data;
  },
  deletePackage: async (id: string) => {
    const { data } = await api.delete<ApiResponse<null>>(`/admin/featured/packages/${id}`);
    return data;
  },
  // Spots
  getSpots: async (params?: { type?: string; activeOnly?: boolean; vendorId?: string; page?: number; limit?: number }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/featured/spots', { params });
    return data;
  },
  getSpot: async (id: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/admin/featured/spots/${id}`);
    return data;
  },
  createSpot: async (payload: {
    vendorId: string;
    packageId: string;
    type: 'restaurant' | 'experience' | 'offer';
    experienceId?: string;
    offerId?: string;
    startDate: string;
    endDate: string;
  }) => {
    const { data } = await api.post<ApiResponse<any>>('/admin/featured/spots', payload);
    return data;
  },
  updateSpot: async (id: string, payload: any) => {
    const { data } = await api.patch<ApiResponse<any>>(`/admin/featured/spots/${id}`, payload);
    return data;
  },
  deleteSpot: async (id: string) => {
    const { data } = await api.delete<ApiResponse<null>>(`/admin/featured/spots/${id}`);
    return data;
  },
};

// Map overview data
export const mapApi = {
  getVendorMapData: async () => {
    const { data } = await api.get<ApiResponse<any>>('/admin/vendors/map-data');
    return data;
  },
};

// Platform revenue — wraps the direct-fetch pattern in revenue/page.tsx
// Uses the axios instance for consistent auth token refresh and error handling
export const revenueApi = {
  getByPeriod: async (params?: { month?: string; type?: string; page?: number; limit?: number }) => {
    const { data } = await api.get<ApiResponse<any>>('/admin/platform-revenue', { params });
    return data;
  },
  getCsv: async (params?: { month?: string; type?: string }) => {
    const response = await api.get('/admin/platform-revenue', {
      params: { ...params, format: 'csv' },
      responseType: 'text',
    });
    return response.data as string;
  },
};

export default api;
