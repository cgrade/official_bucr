import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token and handle FormData
api.interceptors.request.use((config) => {
  const token = Cookies.get('vendor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Remove Content-Type for FormData - axios will set it with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const requestUrl = error.config?.url || '';
    const isAuthRoute = requestUrl.includes('/auth/');
    
    if (error.response?.status === 401 && !isAuthRoute) {
      Cookies.remove('vendor_token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<ApiResponse<{ user: any; vendor: any; tokens: { accessToken: string; refreshToken: string } }>>('/auth/vendor/login', { email, password });
    return data;
  },
  register: async (payload: any) => {
    const { data } = await api.post<ApiResponse<{ user: any; vendor: any; tokens: { accessToken: string; refreshToken: string } }>>('/auth/vendor/register', payload);
    return data;
  },
  logout: async () => {
    const { data } = await api.post<ApiResponse<null>>('/auth/logout');
    return data;
  },
  getProfile: async () => {
    const { data } = await api.get<ApiResponse<any>>('/vendor/profile');
    return data;
  },
};

// Reservations API
export const reservationsApi = {
  getAll: async (params?: { status?: string; date?: string; page?: number }) => {
    const { data } = await api.get<PaginatedResponse<any>>('/vendor/reservations', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/vendor/reservations/${id}`);
    return data;
  },
  getToday: async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await api.get<PaginatedResponse<any>>('/vendor/reservations', { params: { date: today } });
    return data;
  },
  checkIn: async (reservationId: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/vendor/reservations/${reservationId}/check-in`);
    return data;
  },
  verifyQR: async (qrData: string) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/reservations/verify-qr', { qrData });
    return data;
  },
  verifyPin: async (pin: string) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/reservations/verify-pin', { pin });
    return data;
  },
  verifyReference: async (reference: string) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/reservations/verify-reference', { reference });
    return data;
  },
};

// Orders API
export const ordersApi = {
  getAll: async (params?: { status?: string; page?: number }) => {
    const { data } = await api.get<PaginatedResponse<any>>('/vendor/orders', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/vendor/orders/${id}`);
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data } = await api.patch<ApiResponse<any>>(`/vendor/orders/${id}/status`, { status });
    return data;
  },
};

// Display Settings API
export const displaySettingsApi = {
  get: async () => {
    const { data } = await api.get<ApiResponse<any>>('/vendor/display-settings');
    return data;
  },
  update: async (settings: {
    showExperiences?: boolean;
    showSpecialOffers?: boolean;
    showAchievements?: boolean;
    showGallery?: boolean;
    showReviews?: boolean;
    showMenu?: boolean;
    promoMessage?: string | null;
    promoEnabled?: boolean;
  }) => {
    const { data } = await api.patch<ApiResponse<any>>('/vendor/display-settings', settings);
    return data;
  },
};

// Menu API
export const menuApi = {
  getCategories: async () => {
    const { data } = await api.get<ApiResponse<any[]>>('/vendor/menu/categories');
    return data;
  },
  createCategory: async (payload: { name: string; description?: string; sortOrder?: number }) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/menu/categories', payload);
    return data;
  },
  seedDefaultCategories: async () => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/menu/categories/seed');
    return data;
  },
  uploadImage: async (formData: FormData) => {
    const { data } = await api.post<ApiResponse<{ url: string }>>('/vendor/menu/upload', formData);
    return data;
  },
  getItems: async (categoryId?: string) => {
    const { data } = await api.get<ApiResponse<{ categories: any[]; uncategorizedItems: any[] }>>('/vendor/menu', { params: { categoryId } });
    return data;
  },
  createItem: async (payload: any) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/menu', payload);
    return data;
  },
  updateItem: async (id: string, payload: any) => {
    const { data } = await api.patch<ApiResponse<any>>(`/vendor/menu/${id}`, payload);
    return data;
  },
  deleteItem: async (id: string) => {
    const { data } = await api.delete<ApiResponse<null>>(`/vendor/menu/${id}`);
    return data;
  },
};

// Analytics API
export const analyticsApi = {
  getDashboard: async () => {
    const { data } = await api.get<ApiResponse<any>>('/vendor/analytics/dashboard');
    return data;
  },
  getReservationStats: async (period?: string) => {
    const { data } = await api.get<ApiResponse<any>>('/vendor/analytics/reservations', { params: { period } });
    return data;
  },
};

// Guest Profiles API
export const guestsApi = {
  getAll: async (params?: { page?: number; search?: string }) => {
    const { data } = await api.get<PaginatedResponse<any>>('/vendor/guest-profiles', { params });
    return data;
  },
  getById: async (userId: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/vendor/guest-profiles/${userId}`);
    return data;
  },
  updateNotes: async (userId: string, notes: any) => {
    const { data } = await api.patch<ApiResponse<any>>(`/vendor/guest-profiles/${userId}`, notes);
    return data;
  },
};

// Gallery API
export const galleryApi = {
  getAll: async () => {
    const { data } = await api.get<ApiResponse<any[]>>('/vendor/gallery');
    return data;
  },
  upload: async (formData: FormData) => {
    // Don't set Content-Type header - axios will set it automatically with boundary for FormData
    const { data } = await api.post<ApiResponse<any>>('/vendor/gallery', formData);
    return data;
  },
  update: async (id: string, payload: { caption?: string; isFeatured?: boolean }) => {
    const { data } = await api.patch<ApiResponse<any>>(`/vendor/gallery?imageId=${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete<ApiResponse<null>>(`/vendor/gallery?imageId=${id}`);
    return data;
  },
  setFeatured: async (id: string) => {
    const { data } = await api.patch<ApiResponse<any>>(`/vendor/gallery?imageId=${id}`, { isFeatured: true });
    return data;
  },
};

// Reviews API
export const reviewsApi = {
  getAll: async (params?: { page?: number; rating?: number }) => {
    const { data } = await api.get<PaginatedResponse<any>>('/vendor/reviews', { params });
    return data;
  },
  getStats: async () => {
    const { data } = await api.get<ApiResponse<any>>('/vendor/reviews/stats');
    return data;
  },
  respond: async (reviewId: string, response: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/vendor/reviews/${reviewId}/respond`, { response });
    return data;
  },
  report: async (reviewId: string, reason: string) => {
    const { data } = await api.post<ApiResponse<any>>(`/vendor/reviews/${reviewId}/report`, { reason });
    return data;
  },
};

// Settings API - uses /vendor/profile endpoint
export const settingsApi = {
  getProfile: async () => {
    const { data } = await api.get<ApiResponse<any>>('/vendor/profile');
    return data;
  },
  updateProfile: async (payload: any) => {
    const { data } = await api.patch<ApiResponse<any>>('/vendor/profile', payload);
    return data;
  },
  updateLogo: async (formData: FormData) => {
    // Don't set Content-Type header - axios will set it automatically with boundary for FormData
    const { data } = await api.post<ApiResponse<any>>('/vendor/profile/logo', formData);
    return data;
  },
  getHours: async () => {
    // Hours are part of branch data
    const { data } = await api.get<ApiResponse<any>>('/vendor/branches');
    return data;
  },
  updateHours: async (hours: any[]) => {
    // Hours are updated as part of branch
    const { data } = await api.patch<ApiResponse<any>>('/vendor/branches', { hours });
    return data;
  },
  getNotifications: async () => {
    // Notifications settings - may need backend implementation
    const { data } = await api.get<ApiResponse<any>>('/vendor/profile');
    return { ...data, data: data?.data?.notifications || {} };
  },
  updateNotifications: async (settings: any) => {
    const { data } = await api.patch<ApiResponse<any>>('/vendor/profile', { notifications: settings });
    return data;
  },
  getPayment: async () => {
    // Payment info is part of profile
    const { data } = await api.get<ApiResponse<any>>('/vendor/profile');
    return { ...data, data: { bankName: data?.data?.bankName, bankAccountNumber: data?.data?.bankAccountNumber, bankAccountName: data?.data?.bankAccountName } };
  },
  updatePayment: async (payment: any) => {
    const { data } = await api.patch<ApiResponse<any>>('/vendor/profile', payment);
    return data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await api.post<ApiResponse<any>>('/auth/vendor/change-password', { currentPassword, newPassword });
    return data;
  },
};

// Credits API
export const creditsApi = {
  getWallet: async () => {
    const { data } = await api.get<ApiResponse<any>>('/vendor/credits');
    return data;
  },
  getTransactions: async (page = 1, limit = 20, type?: string) => {
    const params: any = { page, limit };
    if (type) params.type = type;
    const { data } = await api.get<ApiResponse<any>>('/vendor/credits/transactions', { params });
    return data;
  },
  initPurchase: async (credits: number, callbackUrl?: string) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/credits/purchase', { credits, callbackUrl });
    return data;
  },
  completePurchase: async (reference: string) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/credits/purchase', { reference });
    return data;
  },
};

// Documents API
export const documentsApi = {
  getAll: async () => {
    const { data } = await api.get<ApiResponse<any[]>>('/vendor/documents');
    return data;
  },
  upload: async (type: string, file: string, fileName: string) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/documents', { type, fileUrl: file, fileName });
    return data;
  },
  uploadFile: async (type: string, formData: FormData) => {
    // First upload the file
    const uploadResponse = await api.post<ApiResponse<{ url: string; publicId: string }>>('/upload', formData);
    if (!uploadResponse.data.success) {
      throw new Error('Upload failed');
    }
    // Then save the document reference
    const { data } = await api.post<ApiResponse<any>>('/vendor/documents', { 
      type, 
      fileUrl: uploadResponse.data.data.url,
      fileName: formData.get('filename') || 'document'
    });
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete<ApiResponse<null>>(`/vendor/documents/${id}`);
    return data;
  },
};

// Subscription API
export const subscriptionApi = {
  getCurrent: async () => {
    const { data } = await api.get<ApiResponse<any>>('/vendor/subscription');
    return data;
  },
  getPlans: async () => {
    const { data } = await api.get<ApiResponse<any[]>>('/vendor/subscription/plans');
    return data;
  },
  upgrade: async (planId: string) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/subscription/upgrade', { planId });
    return data;
  },
  getBillingHistory: async () => {
    const { data } = await api.get<ApiResponse<any[]>>('/vendor/subscription/billing');
    return data;
  },
};

// Achievements API
export const achievementsApi = {
  getAll: async () => {
    const { data } = await api.get<ApiResponse<any[]>>('/vendor/achievements');
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/vendor/achievements/${id}`);
    return data;
  },
  create: async (payload: { title: string; description?: string; icon?: string; badgeType?: string }) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/achievements', payload);
    return data;
  },
  update: async (id: string, payload: { title?: string; description?: string; icon?: string; badgeType?: string }) => {
    const { data } = await api.patch<ApiResponse<any>>(`/vendor/achievements/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete<ApiResponse<null>>(`/vendor/achievements/${id}`);
    return data;
  },
};

// Experiences API
export const experiencesApi = {
  getAll: async () => {
    const { data } = await api.get<ApiResponse<any[]>>('/vendor/experiences');
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/vendor/experiences/${id}`);
    return data;
  },
  create: async (payload: {
    title: string;
    description?: string;
    type: string;
    creditsRequired: number;
    capacity?: number;
    duration?: number;
    availableDays?: number[];
    startTime?: string;
    endTime?: string;
    images?: string[];
  }) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/experiences', payload);
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data } = await api.patch<ApiResponse<any>>(`/vendor/experiences/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete<ApiResponse<null>>(`/vendor/experiences/${id}`);
    return data;
  },
};

// Special Offers API
export const specialOffersApi = {
  getAll: async () => {
    const { data } = await api.get<ApiResponse<any[]>>('/vendor/special-offers');
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<any>>(`/vendor/special-offers/${id}`);
    return data;
  },
  create: async (payload: {
    title: string;
    description?: string;
    image?: string;
    videoUrl?: string;
    discountType?: 'percentage' | 'fixed' | 'bogo';
    discountValue?: number;
    terms?: string;
    validFrom?: string;
    validUntil?: string;
    isActive?: boolean;
  }) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/special-offers', payload);
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data } = await api.patch<ApiResponse<any>>(`/vendor/special-offers/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete<ApiResponse<null>>(`/vendor/special-offers/${id}`);
    return data;
  },
};

// Events API
export const eventsApi = {
  getAll: async (params?: { status?: string; page?: number }) => {
    const { data } = await api.get<PaginatedResponse<any>>('/vendor/events', { params });
    return data;
  },
  create: async (payload: any) => {
    const { data } = await api.post<ApiResponse<any>>('/events', payload);
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data } = await api.patch<ApiResponse<any>>(`/events/${id}`, payload);
    return data;
  },
  publish: async (id: string) => {
    const { data } = await api.patch<ApiResponse<any>>(`/events/${id}`, { action: 'publish' });
    return data;
  },
  cancel: async (id: string, reason?: string) => {
    const { data } = await api.patch<ApiResponse<any>>(`/events/${id}`, { action: 'cancel', reason });
    return data;
  },
  uploadImage: async (base64: string, filename?: string): Promise<string> => {
    const { data } = await api.post<ApiResponse<{ url: string }>>('/upload', {
      file: base64,
      folder: 'events',
      filename,
    });
    if (!data.success || !data.data?.url) throw new Error('Image upload failed');
    return data.data.url;
  },
};

// Featured Spots API
export const featuredApi = {
  getData: async () => {
    const { data } = await api.get<ApiResponse<{
      activeSpots: any[];
      pastSpots: any[];
      availablePackages: any[];
      walletBalance: number;
    }>>('/vendor/featured');
    return data;
  },
  purchase: async (payload: {
    packageId: string;
    experienceId?: string;
    offerId?: string;
  }) => {
    const { data } = await api.post<ApiResponse<any>>('/vendor/featured', payload);
    return data;
  },
};
