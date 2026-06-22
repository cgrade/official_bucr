'use client';

/**
 * Vendor Portal Header — pure BUCR brand palette
 */
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import {
  Search, Bell, ChevronRight, Menu, X, LogOut,
  Settings, CreditCard, CalendarCheck, ShoppingBag, Home,
} from 'lucide-react';
import { BucrWordmark } from '@/components/ui/BucrWordmark';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

const getPageTitle = (pathname: string) => {
  const seg = pathname.split('/').filter(Boolean).pop() ?? 'dashboard';
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
};

// Brand token classes
const HDR_BG     = 'bg-[#0f2547]';
const BORDER     = 'border-[rgba(201,168,76,0.18)]';
const TEXT       = 'text-[#f5f0e8]';
const TEXT_MUTED = 'text-[#7a8fa6]';
const TEXT_GOLD  = 'text-[#c9a84c]';
const ICON_BTN   = 'p-2 rounded-lg text-[#7a8fa6] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.06)] transition-colors';

export function Header({ onMenuClick, isSidebarOpen }: HeaderProps) {
  const pathname = usePathname();
  const { vendor, logout } = useAuthStore();
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: profileData } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: () => settingsApi.getProfile(),
    staleTime: 10_000,
  });

  const profile      = profileData?.data;
  const businessName = profile?.businessName || vendor?.businessName;
  const logo         = profile?.logo;
  const tier         = profile?.subscriptionTier || vendor?.subscriptionTier || 'basic';
  // Blue tick = Pro or Elite subscription (not verification status)
  const tierNorm = tier === 'premium' ? 'elite' : (tier || 'basic');
  const isPremium = tierNorm === 'pro' || tierNorm === 'elite';
  const pageTitle    = getPageTitle(pathname);

  const initials = (name?: string) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'V';

  useEffect(() => {
    if (!showNotifs && !showProfile) return;
    const close = () => { setShowNotifs(false); setShowProfile(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showNotifs, showProfile]);

  return (
    <header className={cn('sticky top-0 z-50 border-b', HDR_BG, BORDER)}>
      <div className="h-16 flex items-center justify-between gap-4 px-4 md:px-6">

        {/* Left: mobile menu + logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={onMenuClick} className={cn(ICON_BTN, 'lg:hidden')} aria-label="Toggle menu">
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <BucrWordmark height={26} />
            <span className="hidden sm:inline-block text-[8px] font-sans font-semibold tracking-[0.18em] uppercase text-[#7a8fa6] border border-[rgba(201,168,76,0.25)] px-1.5 py-0.5 rounded">
              Vendor
            </span>
          </Link>
        </div>

        {/* Center: search */}
        <div className="hidden md:flex flex-1 max-w-sm mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8fa6]" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search reservations, orders…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-lg text-[13px] bg-[rgba(255,255,255,0.05)] border border-[rgba(201,168,76,0.18)] text-[#f5f0e8] placeholder:text-[#7a8fa6] focus:outline-none focus:border-[#c9a84c] focus:bg-[rgba(255,255,255,0.07)] transition-all"
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => searchRef.current?.focus()} className={cn(ICON_BTN, 'md:hidden')}>
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setShowNotifs(!showNotifs); setShowProfile(false); }}
              className={cn(ICON_BTN, 'relative')}>
              <Bell className="h-5 w-5" />
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border shadow-2xl overflow-hidden bg-[#0f2547] border-[rgba(201,168,76,0.25)]"
                onClick={e => e.stopPropagation()}>
                <div className="px-4 py-3 border-b border-[rgba(201,168,76,0.15)]">
                  <h3 className="text-[13px] font-semibold text-[#f5f0e8]">Notifications</h3>
                </div>
                <div className="py-8 text-center">
                  <Bell className="h-8 w-8 text-[rgba(201,168,76,0.2)] mx-auto mb-2" />
                  <p className="text-[12px] text-[#7a8fa6]">No new notifications</p>
                  <p className="text-[11px] text-[rgba(122,143,166,0.5)] mt-1">New bookings and alerts will appear here</p>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-[rgba(201,168,76,0.2)] mx-1 hidden md:block" />

          {/* Profile */}
          <div className="relative ml-1">
            <button onClick={e => { e.stopPropagation(); setShowProfile(!showProfile); setShowNotifs(false); }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f2547] text-[11px] font-bold text-[#f5f0e8] border border-[rgba(201,168,76,0.35)] overflow-hidden">
                {logo ? (
                  <img src={logo.startsWith('http') ? logo : `${process.env.NEXT_PUBLIC_API_URL}${logo}`}
                    alt="" className="w-full h-full object-cover" />
                ) : initials(businessName)}
              </div>
              <div className="hidden lg:flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <span className="text-[12px] font-medium text-[#f5f0e8] leading-tight max-w-[90px] truncate">
                    {businessName || 'Restaurant'}
                  </span>
                  {isPremium && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1d9bf0] text-white text-[8px] font-black flex-shrink-0">✓</span>
                  )}
                </div>
                <span className="text-[9px] text-[#c9a84c] capitalize">{tierNorm} Plan</span>
              </div>
              <ChevronRight className="hidden lg:block h-3.5 w-3.5 text-[#7a8fa6] rotate-90" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-2xl overflow-hidden bg-[#0f2547] border-[rgba(201,168,76,0.25)]"
                onClick={e => e.stopPropagation()}>
                {/* Profile header */}
                <div className="p-4 bg-[#0f2547] border-b border-[rgba(201,168,76,0.15)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(201,168,76,0.4)] bg-[rgba(255,255,255,0.1)] text-[12px] font-bold text-[#f5f0e8] overflow-hidden">
                      {logo ? (
                        <img src={logo.startsWith('http') ? logo : `${process.env.NEXT_PUBLIC_API_URL}${logo}`}
                          alt="" className="w-full h-full object-cover" />
                      ) : initials(businessName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-[#f5f0e8] truncate max-w-[110px]">
                          {businessName || 'Your Restaurant'}
                        </p>
                        {isPremium && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1d9bf0] text-white text-[9px] font-black flex-shrink-0">✓</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#c9a84c] capitalize mt-0.5">{tierNorm} Plan</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  {[
                    { label: 'Settings',     href: '/settings/index',  icon: Settings },
                    { label: 'Subscription', href: '/subscription', icon: CreditCard },
                  ].map(item => (
                    <Link key={item.label} href={item.href} onClick={() => setShowProfile(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-[rgba(245,240,232,0.75)] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
                      <item.icon className="h-4 w-4 text-[#7a8fa6]" />
                      {item.label}
                    </Link>
                  ))}
                  <div className="my-1.5 border-t border-[rgba(201,168,76,0.1)]" />
                  <button onClick={() => { setShowProfile(false); logout(); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-[rgba(239,68,68,0.75)] hover:text-[#f87171] hover:bg-[rgba(239,68,68,0.08)] transition-colors w-full">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumb bar */}
      <div className={cn('h-10 flex items-center gap-3 px-4 md:px-6 border-t bg-[rgba(255,255,255,0.02)]', BORDER)}>
        <Link href="/dashboard" className="text-[#7a8fa6] hover:text-[#c9a84c] transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        {pathname !== '/dashboard' && (
          <>
            <ChevronRight className="h-3 w-3 text-[rgba(201,168,76,0.3)]" />
            <span className="text-[12px] font-medium text-[#f5f0e8]">{pageTitle}</span>
          </>
        )}
        <div className="ml-auto">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[rgba(201,168,76,0.5)]">
            Bucr Vendor
          </span>
        </div>
      </div>
    </header>
  );
}
