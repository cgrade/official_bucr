import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'bucr_token';
const REFRESH_KEY = 'bucr_refresh';

export const tokenStorage = {
  get: () => Cookies.get(TOKEN_KEY) || null,
  getRefresh: () => Cookies.get(REFRESH_KEY) || null,
  set: (access: string, refresh?: string) => {
    Cookies.set(TOKEN_KEY, access, { expires: 1, sameSite: 'lax' });
    if (refresh) Cookies.set(REFRESH_KEY, refresh, { expires: 7, sameSite: 'lax' });
  },
  clear: () => {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(REFRESH_KEY);
  },
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: async (data: { name: string; email: string; phone: string; password: string; country?: string }) => {
    const res = await api.post<ApiResponse<{ user: any; tokens: { accessToken: string; refreshToken: string } }>>('/auth/register', data);
    return res.data;
  },
  login: async (email: string, password: string) => {
    const res = await api.post<ApiResponse<{ user: any; tokens: { accessToken: string; refreshToken: string } }>>('/auth/login', { email, password });
    return res.data;
  },
  me: async () => {
    const res = await api.get<ApiResponse<any>>('/auth/me');
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
    return res.data;
  },
};

// ── Vendors / discovery ──────────────────────────────────────────────────────
export const vendorsApi = {
  getAll: async (params?: Record<string, any>) => {
    const res = await api.get<ApiResponse<any>>('/vendors', { params });
    return res.data;
  },
  getBySlug: async (slug: string) => {
    const res = await api.get<ApiResponse<any>>(`/vendors/${slug}`);
    return res.data;
  },
  getLocations: async () => {
    const res = await api.get<ApiResponse<{ countries: Array<{ country: string; vendorCount: number; cities: Array<{ city: string; count: number }> }> }>>('/vendors/locations');
    return res.data;
  },
};

export const featuredApi = {
  getAll: async () => {
    const res = await api.get<ApiResponse<{ featuredRestaurants: any[]; featuredExperiences: any[]; featuredOffers: any[] }>>('/featured');
    return res.data;
  },
};

// ── Reservations ─────────────────────────────────────────────────────────────
export const reservationsApi = {
  create: async (data: { vendorId: string; branchId?: string; date: string; time: string; partySize: number; specialRequests?: string }) => {
    const res = await api.post<ApiResponse<any>>('/reservations', data);
    return res.data;
  },
  getMine: async () => {
    const res = await api.get<ApiResponse<any>>('/users/reservations');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/reservations/${id}`);
    return res.data;
  },
};

// ── Credits / wallet ─────────────────────────────────────────────────────────
export const creditsApi = {
  getBalance: async () => {
    const res = await api.get<ApiResponse<any>>('/users/credits');
    return res.data;
  },
  initializePurchase: async (credits: number, callbackUrl?: string) => {
    const res = await api.post<ApiResponse<{ authorizationUrl: string; reference: string }>>('/users/credits/purchase', {
      credits,
      ...(callbackUrl ? { callbackUrl } : {}),
    });
    return res.data;
  },
};

// ── Config (currency / phone formats) ────────────────────────────────────────
export const configApi = {
  getCurrency: async () => {
    const res = await api.get<ApiResponse<any>>('/config/currency');
    return res.data;
  },
};
