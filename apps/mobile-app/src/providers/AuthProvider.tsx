import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';

interface AuthContextType {
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  requireAuth: (callback: () => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [isGuest, setIsGuest] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedRoute = ['booking', 'order', 'wallet'].some(
      route => segments[0] === route || segments.includes(route as never)
    );

    // If user tries to access protected routes without auth, redirect to login
    if (inProtectedRoute && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
    
    // If authenticated user is in auth group, redirect to home
    if (inAuthGroup && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  const requireAuth = (callback: () => void) => {
    if (isAuthenticated) {
      callback();
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <AuthContext.Provider value={{ isGuest, setIsGuest, requireAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
