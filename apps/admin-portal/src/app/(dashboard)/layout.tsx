'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import Cookies from 'js-cookie';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, admin, _hasHydrated } = useAuthStore();
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || !admin)) router.push('/login');
  }, [isAuthenticated, admin, router, _hasHydrated]);

  if (!_hasHydrated || !isAuthenticated || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f2547]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#c9a84c] animate-pulse" />
          <div className="h-2 w-24 rounded-full bg-[rgba(201,168,76,0.2)] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f2547] flex flex-col">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-[#0a1d3a]">
          {children}
        </main>
      </div>
    </div>
  );
}
