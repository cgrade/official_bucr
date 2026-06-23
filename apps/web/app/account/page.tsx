'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Wallet, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, ready, logout } = useAuthStore();

  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/account'); }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated || !user) return <div className="max-w-2xl mx-auto px-5 py-20 text-center text-[#7a8fa6]">Loading…</div>;

  const rows = [
    { href: '/bookings', icon: CalendarCheck, label: 'Your reservations' },
    { href: '/wallet', icon: Wallet, label: 'Wallet & credits' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="card p-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0f2547] text-[#f5f0e8] text-xl font-bold">
          {user.name?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#0f2547]">{user.name}</h1>
          <p className="text-[13px] text-[#7a8fa6]">{user.email}</p>
        </div>
      </div>

      <div className="card mt-5 divide-y divide-[rgba(15,37,71,0.06)]">
        {rows.map((r) => (
          <Link key={r.href} href={r.href} className="flex items-center gap-3 px-5 py-4 hover:bg-[rgba(15,37,71,0.02)]">
            <r.icon className="h-5 w-5 text-[#c9a84c]" />
            <span className="flex-1 text-[14px] font-medium text-[#0f2547]">{r.label}</span>
            <ChevronRight className="h-4 w-4 text-[#7a8fa6]" />
          </Link>
        ))}
        <button onClick={() => { logout(); router.push('/'); }} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[rgba(239,68,68,0.04)]">
          <LogOut className="h-5 w-5 text-red-500" />
          <span className="flex-1 text-[14px] font-medium text-red-600">Sign out</span>
        </button>
      </div>
    </div>
  );
}
