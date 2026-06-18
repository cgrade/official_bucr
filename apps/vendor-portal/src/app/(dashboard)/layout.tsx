'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth.store';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { cn } from '@/lib/utils';
import Cookies from 'js-cookie';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, fetchProfile } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Enable real-time data synchronization
  useRealtimeSync({
    enabled: isAuthenticated,
    onConnected: () => console.log('Real-time sync connected'),
    onDisconnected: () => console.log('Real-time sync disconnected'),
  });

  useEffect(() => {
    const token = Cookies.get('vendor_token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (!isAuthenticated) {
      fetchProfile().catch(() => {
        router.push('/login');
      });
    }
  }, [isAuthenticated, fetchProfile, router]);

  // Loading state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-tertiary-500 to-tertiary-600 animate-pulse" />
          <div className="h-2 w-24 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Header - Full width at top */}
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />

      {/* Content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main content area */}
        <main className="flex-1 p-4 md:p-5 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
