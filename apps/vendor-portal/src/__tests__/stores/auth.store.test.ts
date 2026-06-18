import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';

// Mock js-cookie
vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

// Mock auth API
vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
  },
}));

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      vendor: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('should have initial state', () => {
    const state = useAuthStore.getState();
    
    expect(state.vendor).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('should set vendor correctly', () => {
    const { setVendor } = useAuthStore.getState();
    const vendor = {
      id: 'vendor-1',
      email: 'vendor@test.com',
      businessName: 'Test Restaurant',
      phone: '1234567890',
      subscriptionTier: 'BASIC' as const,
      isVerified: true,
    };
    
    setVendor(vendor);
    
    const state = useAuthStore.getState();
    expect(state.vendor).toEqual(vendor);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should have login function', () => {
    const { login } = useAuthStore.getState();
    expect(typeof login).toBe('function');
  });

  it('should have logout function', () => {
    const { logout } = useAuthStore.getState();
    expect(typeof logout).toBe('function');
  });

  it('should have fetchProfile function', () => {
    const { fetchProfile } = useAuthStore.getState();
    expect(typeof fetchProfile).toBe('function');
  });
});
