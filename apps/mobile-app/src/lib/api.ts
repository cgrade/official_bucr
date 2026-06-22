import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { config } from './config';

const api = axios.create({
  baseURL: `${config.apiUrl}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Token storage keys
const ACCESS_TOKEN_KEY = 'bucr_access_token';
const REFRESH_TOKEN_KEY = 'bucr_refresh_token';

// Token management
export const tokenStorage = {
  getAccessToken: async () => {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setAccessToken: async (token: string) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },
  getRefreshToken: async () => {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setRefreshToken: async (token: string) => {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};

// Request interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (refreshToken) {
          const { data } = await axios.post(`${config.apiUrl}/api/auth/refresh`, {
            refreshToken,
          });
          
          if (data.success) {
            const tokens = data.data.tokens ?? data.data;
            await tokenStorage.setAccessToken(tokens.accessToken);
            if (tokens.refreshToken) {
              await tokenStorage.setRefreshToken(tokens.refreshToken);
            }

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            }
            return api(originalRequest);
          }
        }
      } catch {
        await tokenStorage.clearTokens();
      }
    }
    
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth API
export const authApi = {
  register: async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const response = await api.post<ApiResponse<{ user: any; tokens: { accessToken: string; refreshToken: string } }>>('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await api.post<ApiResponse<{ user: any; tokens: { accessToken: string; refreshToken: string } }>>('/auth/login', data);
    return response.data;
  },
  
  logout: async () => {
    await tokenStorage.clearTokens();
  },
  
  getProfile: async () => {
    const response = await api.get<ApiResponse<any>>('/auth/me');
    return response.data;
  },
  
  updateProfile: async (data: { name?: string; phone?: string }) => {
    const response = await api.patch<ApiResponse<any>>('/users/profile', data);
    return response.data;
  },

  forgotPassword: async (data: { email?: string; phone?: string }) => {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: { token: string; password: string }) => {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', data);
    return response.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await api.post<ApiResponse<null>>('/users/change-password', data);
    return response.data;
  },

  updatePushToken: async (pushToken: string) => {
    const response = await api.patch<ApiResponse<any>>('/users/profile', { pushToken });
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete<ApiResponse<null>>('/users/me');
    return response.data;
  },
};

// Vendors API
export const vendorsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    cuisineType?: string;
    city?: string;
    lat?: number;
    lng?: number;
    minRating?: number;
    featured?: boolean;
  }) => {
    const response = await api.get<ApiResponse<any[]>>('/vendors', { params });
    return response.data;
  },
  
  getBySlug: async (slug: string, context?: 'dineIn' | 'takeout') => {
    const response = await api.get<ApiResponse<any>>(`/vendors/${slug}`, {
      params: context ? { context } : undefined,
    });
    return response.data;
  },
  
  getFeatured: async () => {
    const response = await api.get<ApiResponse<any[]>>('/vendors', { params: { featured: true, limit: 5 } });
    return response.data;
  },
};

// Featured API
export const featuredApi = {
  getAll: async () => {
    const response = await api.get<ApiResponse<{
      featuredRestaurants: any[];
      featuredExperiences: any[];
      featuredOffers: any[];
    }>>('/featured');
    return response.data;
  },
};

// Reservations API
export const reservationsApi = {
  create: async (data: {
    vendorId: string;
    branchId?: string;
    date: string;
    time: string;
    partySize: number;
    specialRequests?: string;
    occasion?: string;
  }) => {
    // Generate idempotency key per request — prevents double-booking on network retry
    const idempotencyKey = `res_${data.vendorId}_${data.date}_${data.time}_${data.partySize}_${Date.now()}`;
    const response = await api.post<ApiResponse<any>>('/reservations', data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return response.data;
  },
  
  getAll: async () => {
    const response = await api.get<ApiResponse<any[]>>('/users/reservations');
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<any>>(`/reservations/${id}`);
    return response.data;
  },
  
  cancel: async (id: string, reason?: string) => {
    const params = reason ? { reason } : {};
    const response = await api.delete<ApiResponse<any>>(`/reservations/${id}`, { params });
    return response.data;
  },
  
  modify: async (id: string, data: { date?: string; time?: string; partySize?: number; specialRequests?: string }) => {
    const response = await api.put<ApiResponse<any>>(`/reservations/${id}`, data);
    return response.data;
  },
};

// Credits API
export const creditsApi = {
  getBalance: async () => {
    const response = await api.get<ApiResponse<{ 
      balance: number; 
      balanceValue: number;
      expiringIn30Days: number;
      expiringValue: number;
      transactions: any[];
    }>>('/users/credits');
    return response.data;
  },
  
  getTransactions: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<ApiResponse<{ 
      balance: number; 
      balanceValue: number;
      expiringIn30Days: number;
      expiringValue: number;
      transactions: any[];
    }>>('/users/credits', { params });
    return response.data;
  },
  
  initializePurchase: async (credits: number) => {
    const response = await api.post<
      ApiResponse<{ authorizationUrl: string; reference: string; accessCode?: string }>
    >('/users/credits/purchase', { credits });
    const body = response.data;
    if (!body.success || !body.data?.authorizationUrl) {
      const err = (body as { error?: string }).error;
      throw new Error(err || 'Failed to initialize purchase');
    }
    return body.data;
  },
};

// Reviews API
export const reviewsApi = {
  create: async (data: { reservationId: string; rating: number; comment?: string }) => {
    const response = await api.post<ApiResponse<any>>('/reviews', data);
    return response.data;
  },
  
  getForVendor: async (vendorId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get<ApiResponse<{ reviews: any[]; total: number; averageRating: number }>>(`/vendors/${vendorId}/reviews`, { params });
    return response.data;
  },
  
  getMyReviews: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<ApiResponse<any[]>>('/users/reviews', { params });
    return response.data;
  },
};

// Experiences API
export const experiencesApi = {
  getAll: async (params?: { featured?: boolean; vendorId?: string; limit?: number }) => {
    const response = await api.get<ApiResponse<any[]>>('/experiences', { params });
    return response.data;
  },
  
  getFeatured: async () => {
    const response = await api.get<ApiResponse<any[]>>('/experiences', { params: { featured: true, limit: 5 } });
    return response.data;
  },
};

// Users API
export const usersApi = {
  getProfile: async () => {
    const response = await api.get<ApiResponse<any>>('/users/profile');
    return response.data;
  },
  
  updateProfile: async (data: any) => {
    const response = await api.put<ApiResponse<any>>('/users/profile', data);
    return response.data;
  },
  
  uploadAvatar: async (file: File | Blob) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post<ApiResponse<any>>('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // React Native: use native fetch() — axios strips/mangles the multipart boundary
  // when a custom Content-Type is set, causing the server to reject the upload.
  // fetch() lets React Native set the correct "multipart/form-data; boundary=..." header.
  uploadAvatarUri: async (formData: FormData) => {
    const token = await tokenStorage.getAccessToken();
    const url = `${config.apiUrl}/api/users/profile/avatar`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // DO NOT set Content-Type — React Native fetch auto-sets it with the boundary
      },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err?.message || 'Upload failed');
    }
    return response.json() as Promise<ApiResponse<any>>;
  },
  
  deleteAvatar: async () => {
    const response = await api.delete<ApiResponse<any>>('/users/profile/avatar');
    return response.data;
  },
};

// Favorites API
export const favoritesApi = {
  getAll: async () => {
    const response = await api.get<ApiResponse<any[]>>('/users/favorites');
    return response.data;
  },
  
  add: async (vendorId: string) => {
    const response = await api.post<ApiResponse<any>>('/users/favorites', { vendorId });
    return response.data;
  },
  
  remove: async (vendorId: string) => {
    const response = await api.delete<ApiResponse<null>>('/users/favorites', { params: { vendorId } });
    return response.data;
  },
};

// Orders API
export const ordersApi = {
  create: async (data: {
    vendorId: string;
    branchId?: string;
    orderType: 'pickup' | 'delivery';
    items: Array<{ menuItemId: string; name: string; quantity: number; price: number; notes?: string }>;
    deliveryAddress?: string;
    deliveryCity?: string;
    deliveryNotes?: string;
    scheduledTime?: string;
  }) => {
    const response = await api.post<ApiResponse<any>>('/orders', data);
    return response.data;
  },

  getAll: async (params?: { page?: number; limit?: number; status?: string; orderType?: string }) => {
    const response = await api.get<ApiResponse<any[]>>('/users/orders', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<any>>(`/orders/${id}`);
    return response.data;
  },

  cancel: async (id: string, reason?: string) => {
    const response = await api.patch<ApiResponse<any>>(`/orders/${id}`, { status: 'cancelled', reason });
    return response.data;
  },

  confirmPayment: async (id: string) => {
    const response = await api.post<ApiResponse<any>>(`/orders/${id}/confirm-payment`);
    return response.data;
  },
};

// Waitlist API
export const waitlistApi = {
  join: async (data: { vendorId: string; branchId?: string; partySize: number; date: string; time: string }) => {
    // Backend expects desiredDate / desiredTime
    const payload = { vendorId: data.vendorId, branchId: data.branchId, partySize: data.partySize,
      desiredDate: data.date, desiredTime: data.time };
    const response = await api.post<ApiResponse<any>>('/waitlist', payload);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get<ApiResponse<any[]>>('/waitlist');
    return response.data;
  },

  leave: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/waitlist/${id}`);
    return response.data;
  },
};

// Events API
export const eventsApi = {
  getUpcoming: async (params?: { city?: string; category?: string; page?: number; limit?: number }) => {
    const response = await api.get<ApiResponse<any>>('/events', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<any>>(`/events/${id}`);
    return response.data;
  },

  purchaseTicket: async (data: { eventId: string; quantity: number }) => {
    const response = await api.post<ApiResponse<any>>(`/events/${data.eventId}/tickets`, { quantity: data.quantity });
    return response.data;
  },

  createBundle: async (data: { eventId: string; reservationId: string }) => {
    const response = await api.post<ApiResponse<any>>(`/events/${data.eventId}/bundles`, { reservationId: data.reservationId });
    return response.data;
  },

  getUserTickets: async () => {
    const response = await api.get<ApiResponse<any[]>>('/users/event-tickets');
    return response.data;
  },

  getUserBundles: async () => {
    const response = await api.get<ApiResponse<any[]>>('/users/event-bundles');
    return response.data;
  },
};

// Gifts API
export const giftsApi = {
  /** Send a gift to a user by email or phone */
  send: async (data: { creditAmount: number; recipientEmail?: string; recipientPhone?: string; message?: string }) => {
    const response = await api.post<ApiResponse<any>>('/gifts', data);
    return response.data;
  },
  /** Claim a pending gift addressed to the authenticated user */
  claim: async (giftId: string) => {
    const response = await api.post<ApiResponse<any>>(`/gifts/${giftId}/claim`);
    return response.data;
  },
  /** Get all sent and received gifts */
  getAll: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<ApiResponse<any>>('/users/gifts', { params });
    return response.data;
  },
};

// Notifications API
export const notificationsApi = {
  getAll: async (params?: { page?: number; limit?: number; unread?: boolean }) => {
    const response = await api.get<ApiResponse<any>>('/users/notifications', { params });
    return response.data;
  },
  markRead: async (notificationId: string) => {
    const response = await api.patch<ApiResponse<any>>(`/users/notifications/${notificationId}`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.post<ApiResponse<any>>('/users/notifications/read-all');
    return response.data;
  },
};

export const referralApi = {
  getStats: async () => {
    const response = await api.get<ApiResponse<any>>('/users/referral-stats');
    return response.data;
  },
};

export const notificationPreferencesApi = {
  get: async () => {
    const response = await api.get<ApiResponse<Record<string, boolean>>>('/users/notification-preferences');
    return response.data;
  },
  update: async (prefs: Record<string, boolean>) => {
    const response = await api.patch<ApiResponse<Record<string, boolean>>>('/users/notification-preferences', prefs);
    return response.data;
  },
};

export default api;
