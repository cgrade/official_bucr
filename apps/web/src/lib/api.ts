import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
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
  data: T;
  message?: string;
  error?: string;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor with one-shot token refresh (mirrors mobile).
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = tokenStorage.getRefresh();
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
          if (data.success) {
            const tokens = data.data.tokens ?? data.data;
            tokenStorage.set(tokens.accessToken, tokens.refreshToken);
            if (original.headers) original.headers.Authorization = `Bearer ${tokens.accessToken}`;
            return api(original);
          }
        }
      } catch {
        tokenStorage.clear();
      }
    }
    return Promise.reject(error);
  },
);

// Stable anonymous viewer id for fair, deduped featured impression/click counting.
function getViewerId(): string {
  if (typeof window === 'undefined') return 'v_ssr';
  try {
    let id = window.localStorage.getItem('bucr_viewer_id');
    if (!id) {
      id = 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      window.localStorage.setItem('bucr_viewer_id', id);
    }
    return id;
  } catch {
    return 'v_anon';
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: async (data: { name: string; email: string; phone: string; password: string; country?: string }) => {
    const res = await api.post<ApiResponse<{ user: any; tokens: { accessToken: string; refreshToken: string } }>>('/auth/register', data);
    return res.data;
  },
  login: async (email: string, password: string) => {
    const res = await api.post<ApiResponse<{ user: any; tokens: { accessToken: string; refreshToken: string } }>>('/auth/login', { email, password });
    return res.data;
  },
  me: async () => (await api.get<ApiResponse<any>>('/auth/me')).data,
  forgotPassword: async (email: string) => (await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email })).data,
  resetPassword: async (token: string, password: string) => (await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', { token, password })).data,
  changePassword: async (currentPassword: string, newPassword: string) =>
    (await api.post<ApiResponse<null>>('/users/change-password', { currentPassword, newPassword })).data,
  deleteAccount: async () => (await api.delete<ApiResponse<null>>('/users/me')).data,
};

// ── Config ────────────────────────────────────────────────────────────────────
export const configApi = {
  getCurrency: async () => (await api.get<ApiResponse<any>>('/config/currency')).data,
};

// ── Users / profile ───────────────────────────────────────────────────────────
export const usersApi = {
  getProfile: async () => (await api.get<ApiResponse<any>>('/users/profile')).data,
  updateProfile: async (data: any) => (await api.put<ApiResponse<any>>('/users/profile', data)).data,
  uploadAvatar: async (file: File | Blob) => {
    const fd = new FormData();
    fd.append('avatar', file);
    const res = await api.post<ApiResponse<any>>('/users/profile/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  deleteAvatar: async () => (await api.delete<ApiResponse<any>>('/users/profile/avatar')).data,
};

// ── Vendors / discovery ───────────────────────────────────────────────────────
export const vendorsApi = {
  getAll: async (params?: Record<string, any>) => (await api.get<ApiResponse<any[]>>('/vendors', { params })).data,
  getLocations: async () =>
    (await api.get<ApiResponse<{ countries: Array<{ country: string; vendorCount: number; cities: Array<{ city: string; count: number }> }> }>>('/vendors/locations')).data,
  getBySlug: async (slug: string, context?: 'dineIn' | 'takeout') =>
    (await api.get<ApiResponse<any>>(`/vendors/${slug}`, { params: context ? { context } : undefined })).data,
  getFeatured: async () => (await api.get<ApiResponse<any[]>>('/vendors', { params: { featured: true, limit: 5 } })).data,
};

export const featuredApi = {
  getAll: async () =>
    (await api.get<ApiResponse<{ featuredRestaurants: any[]; featuredExperiences: any[]; featuredOffers: any[] }>>('/featured')).data,
  trackImpressions: (spotIds: string[]) => {
    if (!spotIds.length) return;
    api.post('/featured/impressions', { spotIds, viewerId: getViewerId() }).catch(() => {});
  },
  trackClick: (spotId: string) => {
    api.post(`/featured/${spotId}/click`, { viewerId: getViewerId() }).catch(() => {});
  },
};

// ── Reservations ──────────────────────────────────────────────────────────────
export const reservationsApi = {
  create: async (data: { vendorId: string; branchId?: string; date: string; time: string; partySize: number; specialRequests?: string; occasion?: string }) => {
    const idempotencyKey = `res_${data.vendorId}_${data.date}_${data.time}_${data.partySize}_${Date.now()}`;
    const res = await api.post<ApiResponse<any>>('/reservations', data, { headers: { 'Idempotency-Key': idempotencyKey } });
    return res.data;
  },
  getMine: async () => (await api.get<ApiResponse<any[]>>('/users/reservations')).data,
  getById: async (id: string) => (await api.get<ApiResponse<any>>(`/reservations/${id}`)).data,
  cancel: async (id: string, reason?: string) => (await api.delete<ApiResponse<any>>(`/reservations/${id}`, { params: reason ? { reason } : {} })).data,
  modify: async (id: string, data: { date?: string; time?: string; partySize?: number; specialRequests?: string }) =>
    (await api.put<ApiResponse<any>>(`/reservations/${id}`, data)).data,
};

// ── Credits / wallet ──────────────────────────────────────────────────────────
export const creditsApi = {
  getBalance: async () => (await api.get<ApiResponse<any>>('/users/credits')).data,
  getTransactions: async (params?: { page?: number; limit?: number }) => (await api.get<ApiResponse<any>>('/users/credits', { params })).data,
  initializePurchase: async (credits: number, callbackUrl?: string) => {
    const res = await api.post<ApiResponse<{ authorizationUrl: string; reference: string; accessCode?: string }>>('/users/credits/purchase', {
      credits,
      ...(callbackUrl ? { callbackUrl } : {}),
    });
    if (!res.data.success || !res.data.data?.authorizationUrl) throw new Error(res.data.error || 'Failed to initialize purchase');
    return res.data.data;
  },
};

// ── Gifts ─────────────────────────────────────────────────────────────────────
export const giftsApi = {
  send: async (data: { creditAmount: number; recipientEmail?: string; recipientPhone?: string; message?: string }) =>
    (await api.post<ApiResponse<any>>('/gifts', data)).data,
  claim: async (giftId: string) => (await api.post<ApiResponse<any>>(`/gifts/${giftId}/claim`)).data,
  getAll: async (params?: { page?: number; limit?: number }) => (await api.get<ApiResponse<any>>('/users/gifts', { params })).data,
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsApi = {
  create: async (data: { reservationId: string; rating: number; comment?: string }) => (await api.post<ApiResponse<any>>('/reviews', data)).data,
  getForVendor: async (vendorId: string, params?: { page?: number; limit?: number }) =>
    (await api.get<ApiResponse<{ reviews: any[]; total: number; averageRating: number }>>(`/vendors/${vendorId}/reviews`, { params })).data,
  getMine: async (params?: { page?: number; limit?: number }) => (await api.get<ApiResponse<any[]>>('/users/reviews', { params })).data,
};

// ── Experiences ───────────────────────────────────────────────────────────────
export const experiencesApi = {
  getAll: async (params?: { featured?: boolean; vendorId?: string; limit?: number }) => (await api.get<ApiResponse<any[]>>('/experiences', { params })).data,
  getFeatured: async () => (await api.get<ApiResponse<any[]>>('/experiences', { params: { featured: true, limit: 5 } })).data,
};

// ── Favorites ─────────────────────────────────────────────────────────────────
export const favoritesApi = {
  getAll: async () => (await api.get<ApiResponse<any[]>>('/users/favorites')).data,
  add: async (vendorId: string) => (await api.post<ApiResponse<any>>('/users/favorites', { vendorId })).data,
  remove: async (vendorId: string) => (await api.delete<ApiResponse<null>>('/users/favorites', { params: { vendorId } })).data,
};

// ── Orders (takeout) ──────────────────────────────────────────────────────────
export const ordersApi = {
  create: async (data: any) => (await api.post<ApiResponse<any>>('/orders', data)).data,
  getAll: async (params?: { page?: number; limit?: number; status?: string; orderType?: string }) => (await api.get<ApiResponse<any[]>>('/users/orders', { params })).data,
  getById: async (id: string) => (await api.get<ApiResponse<any>>(`/orders/${id}`)).data,
  cancel: async (id: string, reason?: string) => (await api.patch<ApiResponse<any>>(`/orders/${id}`, { status: 'cancelled', reason })).data,
  confirmPayment: async (id: string) => (await api.post<ApiResponse<any>>(`/orders/${id}/confirm-payment`)).data,
};

// ── Events ────────────────────────────────────────────────────────────────────
export const eventsApi = {
  getUpcoming: async (params?: { city?: string; category?: string; page?: number; limit?: number }) => (await api.get<ApiResponse<any>>('/events', { params })).data,
  getById: async (id: string) => (await api.get<ApiResponse<any>>(`/events/${id}`)).data,
  purchaseTicket: async (eventId: string, quantity: number) => (await api.post<ApiResponse<any>>(`/events/${eventId}/tickets`, { quantity })).data,
  getUserTickets: async () => (await api.get<ApiResponse<any[]>>('/users/event-tickets')).data,
  getUserBundles: async () => (await api.get<ApiResponse<any[]>>('/users/event-bundles')).data,
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  getAll: async (params?: { page?: number; limit?: number; unread?: boolean }) => (await api.get<ApiResponse<any>>('/users/notifications', { params })).data,
  markRead: async (id: string) => (await api.patch<ApiResponse<any>>(`/users/notifications/${id}`)).data,
  markAllRead: async () => (await api.post<ApiResponse<any>>('/users/notifications/read-all')).data,
};

export const notificationPreferencesApi = {
  get: async () => (await api.get<ApiResponse<Record<string, boolean>>>('/users/notification-preferences')).data,
  update: async (prefs: Record<string, boolean>) => (await api.patch<ApiResponse<Record<string, boolean>>>('/users/notification-preferences', prefs)).data,
};

// ── Referral ──────────────────────────────────────────────────────────────────
export const referralApi = {
  getStats: async () => (await api.get<ApiResponse<any>>('/users/referral-stats')).data,
};

// ── Waitlist ──────────────────────────────────────────────────────────────────
export const waitlistApi = {
  join: async (data: { vendorId: string; branchId?: string; partySize: number; date: string; time: string }) =>
    (await api.post<ApiResponse<any>>('/waitlist', { vendorId: data.vendorId, branchId: data.branchId, partySize: data.partySize, desiredDate: data.date, desiredTime: data.time })).data,
  getAll: async () => (await api.get<ApiResponse<any[]>>('/waitlist')).data,
  leave: async (id: string) => (await api.delete<ApiResponse<null>>(`/waitlist/${id}`)).data,
};

export default api;
