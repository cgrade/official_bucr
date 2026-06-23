'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Wallet, Heart, Bell, Star, Gift, UserCog, KeyRound, HelpCircle, FileText, Shield, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

const GROUPS: { title: string; rows: { href: string; icon: any; label: string }[] }[] = [
  {
    title: 'Activity',
    rows: [
      { href: '/bookings', icon: CalendarCheck, label: 'Your reservations' },
      { href: '/favorites', icon: Heart, label: 'Saved restaurants' },
      { href: '/account/reviews', icon: Star, label: 'Your reviews' },
    ],
  },
  {
    title: 'Wallet',
    rows: [
      { href: '/wallet', icon: Wallet, label: 'Credits & top-up' },
      { href: '/wallet/gift', icon: Gift, label: 'Gift credits' },
      { href: '/account/referral', icon: Gift, label: 'Refer & earn' },
    ],
  },
  {
    title: 'Settings',
    rows: [
      { href: '/account/edit', icon: UserCog, label: 'Edit profile' },
      { href: '/account/password', icon: KeyRound, label: 'Change password' },
      { href: '/notifications', icon: Bell, label: 'Notifications' },
      { href: '/help', icon: HelpCircle, label: 'Help & support' },
      { href: '/terms', icon: FileText, label: 'Terms of Service' },
      { href: '/privacy', icon: Shield, label: 'Privacy Policy' },
    ],
  },
];

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, ready, logout } = useAuthStore();
  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/account'); }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated || !user) return <div className="max-w-2xl mx-auto px-5 py-20 text-center text-[#7a8fa6]">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="card p-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0f2547] text-[#f5f0e8] text-xl font-bold">{user.name?.charAt(0)?.toUpperCase()}</div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-[#0f2547] truncate">{user.name}</h1>
          <p className="text-[13px] text-[#7a8fa6] truncate">{user.email}</p>
          {typeof user.creditsBalance === 'number' && <p className="text-[12px] text-[#c9a84c] font-semibold mt-0.5">{user.creditsBalance.toLocaleString()} credits</p>}
        </div>
      </div>

      {GROUPS.map((g) => (
        <div key={g.title} className="mt-6">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-[#7a8fa6] mb-2 px-1">{g.title}</h2>
          <div className="card divide-y divide-[rgba(15,37,71,0.06)]">
            {g.rows.map((r) => (
              <Link key={r.href} href={r.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[rgba(15,37,71,0.02)]">
                <r.icon className="h-5 w-5 text-[#c9a84c]" />
                <span className="flex-1 text-[14px] font-medium text-[#0f2547]">{r.label}</span>
                <ChevronRight className="h-4 w-4 text-[#7a8fa6]" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      <button onClick={() => { logout(); router.push('/'); }} className="card mt-6 flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[rgba(239,68,68,0.04)]">
        <LogOut className="h-5 w-5 text-red-500" />
        <span className="flex-1 text-[14px] font-medium text-red-600">Sign out</span>
      </button>
    </div>
  );
}
