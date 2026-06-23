'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, User as UserIcon, Search, Bell } from 'lucide-react';
import { BucrWordmark } from '@/components/ui/BucrWordmark';
import { useAuthStore } from '@/stores/auth.store';

export function Header() {
  const router = useRouter();
  const { user, isAuthenticated, ready, checkAuth, logout } = useAuthStore();

  useEffect(() => {
    if (!ready) checkAuth();
  }, [ready, checkAuth]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[rgba(15,37,71,0.08)]">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <BucrWordmark height={28} />
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[14px] font-medium text-[#0f2547]">
          <Link href="/restaurants" className="hover:text-[#c9a84c] transition-colors">Restaurants</Link>
          <Link href="/#how-it-works" className="hover:text-[#c9a84c] transition-colors">How it works</Link>
          <a href="http://localhost:3001" className="hover:text-[#c9a84c] transition-colors">For restaurants</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/restaurants" className="md:hidden p-2 rounded-lg hover:bg-[rgba(15,37,71,0.05)]" aria-label="Search">
            <Search className="h-5 w-5 text-[#0f2547]" />
          </Link>
          {isAuthenticated ? (
            <>
              <Link href="/notifications" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[rgba(15,37,71,0.05)]" aria-label="Notifications">
                <Bell className="h-5 w-5 text-[#0f2547]" />
              </Link>
              <Link href="/wallet" className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[rgba(201,168,76,0.12)] text-[#0f2547] text-[13px] font-semibold hover:bg-[rgba(201,168,76,0.2)] transition-colors">
                <Wallet className="h-4 w-4 text-[#c9a84c]" />
                {(user?.creditsBalance ?? 0).toLocaleString()} cr
              </Link>
              <Link href="/account" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f2547] text-[#f5f0e8] text-[13px] font-bold" title={user?.name}>
                {user?.name?.charAt(0)?.toUpperCase() || <UserIcon className="h-4 w-4" />}
              </Link>
              <button onClick={() => { logout(); router.push('/'); }} className="hidden sm:block text-[13px] text-[#7a8fa6] hover:text-[#0f2547] ml-1">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 h-9 inline-flex items-center text-[14px] font-medium text-[#0f2547] hover:text-[#c9a84c]">
                Sign in
              </Link>
              <Link href="/register" className="px-4 h-9 inline-flex items-center rounded-lg bg-[#c9a84c] text-[#070f1e] text-[14px] font-semibold hover:bg-[#b8973f] transition-colors">
                Join Bucr
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
