# Bucr Frontend Specification - Part 2: Architecture & Performance

> **Version:** 1.0.0 | **Last Updated:** January 2026

---

## 1. Technology Stack

### 1.1 Web Applications (User, Vendor, Admin)

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 14+ |
| Language | TypeScript | 5+ |
| Styling | Tailwind CSS | 3.4+ |
| UI Components | shadcn/ui (Radix) | Latest |
| Forms | React Hook Form + Zod | 7+ |
| Client State | Zustand | 4+ |
| Server State | TanStack Query | 5+ |
| Charts | Recharts | 2+ |
| Tables | TanStack Table | 8+ |
| Animations | Framer Motion | 10+ |
| Icons | Lucide React | Latest |
| Date/Time | date-fns | 3+ |

### 1.2 Mobile Application

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React Native (Expo) | SDK 50+ |
| Language | TypeScript | 5+ |
| Navigation | Expo Router | 3+ |
| Styling | NativeWind | 4+ |
| UI Components | Custom + RN Paper | 5+ |
| State | Zustand + TanStack Query | - |
| Camera/QR | expo-camera, expo-barcode-scanner | - |
| Maps | react-native-maps | - |
| Animations | Reanimated 3 + Moti | - |
| Icons | Lucide React Native | - |
| Storage | expo-secure-store, AsyncStorage | - |
| Push | expo-notifications | - |

---

## 2. Monorepo Structure

```
bucr/
├── apps/
│   ├── web-user/                 # User web app
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── (auth)/           # Auth routes group
│   │   │   ├── (main)/           # Main app routes
│   │   │   ├── api/              # API routes (proxy)
│   │   │   └── layout.tsx
│   │   ├── components/           # App-specific components
│   │   ├── hooks/                # App-specific hooks
│   │   ├── lib/                  # App utilities
│   │   ├── public/               # Static assets
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   ├── web-vendor/               # Vendor portal
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   └── ...
│   │
│   ├── web-admin/                # Admin portal
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   └── ...
│   │
│   └── mobile/                   # React Native (Expo)
│       ├── app/                  # Expo Router
│       │   ├── (auth)/
│       │   ├── (tabs)/
│       │   ├── venue/
│       │   └── _layout.tsx
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── assets/
│       ├── app.json
│       └── package.json
│
├── packages/
│   ├── ui/                       # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api-client/               # Shared API client
│   │   ├── src/
│   │   │   ├── client.ts         # Axios/fetch wrapper
│   │   │   ├── services/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── venues.ts
│   │   │   │   ├── reservations.ts
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useVenues.ts
│   │   │   │   └── ...
│   │   │   └── types/
│   │   │       └── index.ts
│   │   └── package.json
│   │
│   ├── utils/                    # Shared utilities
│   │   ├── src/
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── helpers.ts
│   │   └── package.json
│   │
│   └── config/                   # Shared config
│       ├── tailwind/
│       │   └── preset.ts
│       ├── eslint/
│       └── tsconfig/
│
├── docs/                         # Documentation
├── turbo.json                    # Turborepo config
├── package.json                  # Root package.json
├── pnpm-workspace.yaml           # PNPM workspaces
└── .env.example
```

---

## 3. Performance Targets

### 3.1 Core Web Vitals

| Metric | Target | Description |
|--------|--------|-------------|
| **LCP** | < 2.5s | Largest Contentful Paint |
| **FID** | < 100ms | First Input Delay |
| **CLS** | < 0.1 | Cumulative Layout Shift |
| **TTFB** | < 600ms | Time to First Byte |
| **FCP** | < 1.8s | First Contentful Paint |
| **TTI** | < 3.8s | Time to Interactive |
| **Bundle** | < 100KB | Initial JS (gzipped) |

### 3.2 Mobile Performance

| Metric | Target | Description |
|--------|--------|-------------|
| App Launch | < 2s | Cold start to interactive |
| Navigation | < 300ms | Screen transitions |
| API Response | < 500ms | Perceived response time |
| Offline | Full | Core features work offline |

---

## 4. Caching Strategy

### 4.1 Layer 1: CDN/Edge (Vercel Edge Network)

```
Static Assets (immutable)
├── Cache-Control: public, max-age=31536000, immutable
└── JS bundles, CSS, fonts, images

ISR Pages (revalidate)
├── Cache-Control: s-maxage=60, stale-while-revalidate=300
└── Venue listings, search results

Dynamic Pages (no-store)
├── Cache-Control: private, no-store
└── User dashboard, checkout, auth pages
```

### 4.2 Layer 2: Service Worker (PWA)

| Strategy | Usage |
|----------|-------|
| Cache-First | Static assets, fonts, icons |
| Network-First | API calls, user data |
| Stale-While-Revalidate | Venue data, menu items |
| Cache-Only | App shell, critical CSS (offline) |

### 4.3 Layer 3: TanStack Query (Application State)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,      // 1 minute
      gcTime: 1000 * 60 * 5,     // 5 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
```

**Query Cache Configuration:**

| Data Type | staleTime | gcTime | Notes |
|-----------|-----------|--------|-------|
| Venues List | 5 min | 30 min | Semi-static |
| Venue Details | 2 min | 10 min | Prefetch on hover |
| User Profile | 1 min | 5 min | Personal data |
| Reservations | 30 sec | 5 min | Frequently updated |
| Credits Balance | 10 sec | 1 min | Real-time critical |

### 4.4 Layer 4: Local Storage / IndexedDB

| Data | Storage | Purpose |
|------|---------|---------|
| User Preferences | localStorage | Theme, language |
| Recent Searches | localStorage | Last 20 queries |
| Offline Data | IndexedDB | Reservations, QR codes |
| Form Drafts | sessionStorage | Auto-save forms |

---

## 5. Image Optimization

### 5.1 Responsive Sizes

| Size | Dimensions | Usage |
|------|------------|-------|
| Thumbnail | 100x100 | Grid views |
| Small | 300x200 | Cards |
| Medium | 600x400 | Detail views |
| Large | 1200x800 | Hero images |
| Full | Original | Lightbox |

### 5.2 Format Strategy

| Format | Support | Size Reduction |
|--------|---------|----------------|
| AVIF | Modern browsers | 50% vs JPEG |
| WebP | Default | 25-35% vs JPEG |
| JPEG | Fallback | Baseline |

### 5.3 Cloudinary Transforms

```
f_auto          → Auto format (AVIF/WebP/JPEG)
q_auto          → Auto quality optimization
w_auto,dpr_auto → Responsive width + DPR
c_fill          → Thumbnail crop
c_limit         → Full image constraint
```

### 5.4 Loading Strategy

| Position | Strategy |
|----------|----------|
| Above fold | `priority`, eager loading |
| Below fold | `loading="lazy"`, intersection observer |
| Placeholder | Blur hash (10x10 base64) |

---

## 6. Bundle Optimization

### 6.1 Code Splitting

| Type | Method | Examples |
|------|--------|----------|
| Route-based | Automatic (Next.js) | Each page = separate chunk |
| Component-based | `React.lazy()` | Charts, Maps, Calendar |
| Library-based | Dynamic imports | date-fns/locale, QR scanner |

### 6.2 Chunk Strategy

| Chunk | Target Size | Contents |
|-------|-------------|----------|
| Framework | ~40KB | React, Next.js core |
| Vendor | ~30KB | Stable dependencies |
| Common | ~10KB | Shared code |
| Page | 5-20KB | Route-specific |

### 6.3 Tree Shaking

```typescript
// ❌ Bad - imports entire library
import * as _ from 'lodash';

// ✅ Good - imports only needed function
import { debounce } from 'lodash-es';

// ✅ Good - barrel export with tree shaking
import { Button, Card } from '@bucr/ui';
```

### 6.4 Font Optimization

```typescript
// next/font for automatic optimization
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['600', '700', '800'],
  display: 'swap',
});
```

---

## 7. State Management

### 7.1 State Categories

| Category | Tool | Scope |
|----------|------|-------|
| Server State | TanStack Query | API data, caching |
| Client State | Zustand | UI state, preferences |
| Form State | React Hook Form | Form inputs |
| URL State | Next.js/Expo Router | Filters, pagination |

### 7.2 Zustand Store Example

```typescript
// stores/auth.store.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (credentials) => {
        const { user, token } = await authService.login(credentials);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateProfile: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));
      },
    }),
    {
      name: 'bucr-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
```

### 7.3 Query Keys Factory

```typescript
export const queryKeys = {
  venues: {
    all: ['venues'] as const,
    lists: () => [...queryKeys.venues.all, 'list'] as const,
    list: (filters: VenueFilters) => [...queryKeys.venues.lists(), filters] as const,
    details: () => [...queryKeys.venues.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.venues.details(), id] as const,
    menu: (id: string) => [...queryKeys.venues.detail(id), 'menu'] as const,
    reviews: (id: string) => [...queryKeys.venues.detail(id), 'reviews'] as const,
  },
  reservations: {
    all: ['reservations'] as const,
    lists: () => [...queryKeys.reservations.all, 'list'] as const,
    list: (filters?: ReservationFilters) => [...queryKeys.reservations.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.reservations.all, 'detail', id] as const,
  },
  user: {
    profile: ['user', 'profile'] as const,
    credits: ['user', 'credits'] as const,
    favorites: ['user', 'favorites'] as const,
    orders: ['user', 'orders'] as const,
  },
  vendor: {
    profile: ['vendor', 'profile'] as const,
    reservations: (filters?: any) => ['vendor', 'reservations', filters] as const,
    orders: (filters?: any) => ['vendor', 'orders', filters] as const,
    analytics: (period?: string) => ['vendor', 'analytics', period] as const,
  },
};
```

---

## 8. API Client

### 8.1 HTTP Client Setup

```typescript
// packages/api-client/src/client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const createApiClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  client.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor - handle errors
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Try refresh token
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          return client.request(error.config!);
        }
        // Redirect to login
        redirectToLogin();
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export const apiClient = createApiClient(process.env.NEXT_PUBLIC_API_URL!);
```

### 8.2 API Service Example

```typescript
// packages/api-client/src/services/reservations.ts
export const reservationService = {
  list: async (filters?: ReservationFilters) => {
    const { data } = await apiClient.get<ApiResponse<Reservation[]>>('/users/reservations', {
      params: filters,
    });
    return data.data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<Reservation>>(`/reservations/${id}`);
    return data.data;
  },

  create: async (payload: CreateReservationPayload) => {
    const { data } = await apiClient.post<ApiResponse<Reservation>>('/reservations', payload);
    return data.data;
  },

  cancel: async (id: string) => {
    const { data } = await apiClient.post<ApiResponse<Reservation>>(`/reservations/${id}/cancel`);
    return data.data;
  },

  modify: async (id: string, payload: ModifyReservationPayload) => {
    const { data } = await apiClient.patch<ApiResponse<Reservation>>(`/reservations/${id}`, payload);
    return data.data;
  },
};
```

### 8.3 React Query Hook Example

```typescript
// packages/api-client/src/hooks/useReservations.ts
export const useReservations = (filters?: ReservationFilters) => {
  return useQuery({
    queryKey: queryKeys.reservations.list(filters),
    queryFn: () => reservationService.list(filters),
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useReservation = (id: string) => {
  return useQuery({
    queryKey: queryKeys.reservations.detail(id),
    queryFn: () => reservationService.getById(id),
    enabled: !!id,
  });
};

export const useCreateReservation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: reservationService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.credits });
    },
  });
};

export const useCancelReservation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: reservationService.cancel,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.credits });
    },
  });
};
```
