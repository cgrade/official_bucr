'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth.store';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { cn, isLocalizedCurrency, getDisplayCurrency } from '@/lib/utils';
import { loadDisplayCurrency } from '@/lib/currency';
import Cookies from 'js-cookie';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, fetchProfile } = useAuthStore();
  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Gate render until the display currency is resolved, so every page paints
  // money in the vendor's local currency from the first frame.
  const [currencyReady, setCurrencyReady] = useState(false);

  useRealtimeSync({ enabled: isAuthenticated });

  useEffect(() => {
    const token = Cookies.get('vendor_token');
    if (!token) { router.push('/login'); return; }
    // Always refresh on mount — ensures subscription tier, verification status, etc.
    // reflect the latest backend state, not a stale persisted value.
    fetchProfile()
      .then(async () => {
        const vendor = useAuthStore.getState().vendor as any;
        const country = vendor?.branches?.[0]?.country || vendor?.country || 'Nigeria';
        await loadDisplayCurrency(country);
      })
      .catch(() => {
        // Only bounce to /login if the session is truly gone (the 401 interceptor clears
        // the token + persisted auth on a hard logout). A transient error with a valid
        // token keeps you in via the persisted profile — prevents the login⇄dashboard flicker.
        if (!Cookies.get('vendor_token')) router.push('/login');
      })
      .finally(() => setCurrencyReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAuthenticated || !currencyReady) {
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
    // Ink background for the outermost shell — deepest layer
    <div className="min-h-screen bg-[#0f2547] flex flex-col">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        {/* Main content — slightly lighter navy so cards stand out */}
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-[#0a1d3a]">
          {isLocalizedCurrency() && (() => {
            const c = getDisplayCurrency();
            return (
              <div className="mb-4 rounded-xl border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.08)] px-4 py-2.5 text-[12px] text-[rgba(245,240,232,0.85)]">
                Amounts are shown in <span className="font-semibold text-[#c9a84c]">{c.symbol} {c.code}</span> as an indicative guide. Billing and settlement are always in Naira (₦).
              </div>
            );
          })()}
          {children}
        </main>
      </div>
    </div>
  );
}
