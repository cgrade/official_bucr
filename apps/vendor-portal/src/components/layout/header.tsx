'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Search,
  Bell,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Settings,
  CreditCard,
  Home,
  CalendarCheck,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BucrLogo } from '@/components/ui/BucrLogo';

interface HeaderProps {
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

const getPageInfo = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Home', href: '/dashboard' }];
  
  let pageTitle = 'Dashboard';
  
  if (segments.length > 0) {
    const currentPage = segments[segments.length - 1];
    pageTitle = currentPage.charAt(0).toUpperCase() + currentPage.slice(1).replace(/-/g, ' ');
    
    if (segments[0] !== 'dashboard') {
      breadcrumbs.push({ name: pageTitle, href: pathname });
    }
  }
  
  return { breadcrumbs, pageTitle };
};

export function Header({ onMenuClick, isSidebarOpen }: HeaderProps) {
  const pathname = usePathname();
  const { vendor, logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: profileData } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: () => settingsApi.getProfile(),
    staleTime: 10000,
  });

  const profile = profileData?.data;
  const businessName = profile?.businessName || vendor?.businessName;
  const logo = profile?.logo;

  const { breadcrumbs, pageTitle } = getPageInfo(pathname);

  const getInitials = (name?: string) => {
    if (!name) return 'V';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setShowNotifications(false);
      setShowProfile(false);
    };
    if (showNotifications || showProfile) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showNotifications, showProfile]);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      {/* Main Header Bar */}
      <div className="h-16 flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        {/* Left Section: Menu + Logo */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <BucrLogo width={120} height={30} />
            <span className="hidden sm:inline text-[10px] font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider">
              Vendor Portal
            </span>
          </Link>
        </div>

        {/* Center Section: Search (desktop) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search reservations, orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full h-10 pl-10 pr-4 rounded-xl text-sm transition-all duration-200",
                "bg-slate-100 dark:bg-slate-800 border-2 border-transparent",
                "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                "text-slate-900 dark:text-slate-100",
                "focus:outline-none focus:bg-white dark:focus:bg-slate-800",
                "focus:border-primary-500 dark:focus:border-primary-500",
                "focus:shadow-sm"
              )}
            />
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {/* Mobile Search Button */}
          <button
            onClick={() => searchRef.current?.focus()}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </button>

            {showNotifications && (
              <div 
                className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
                    <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded-full">2 new</span>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                        <CalendarCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">New reservation</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">John D. booked a table for 4 at 7:00 PM</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">5 min ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">New takeout order</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Order #1234 - 3 items - ₦15,500</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">12 min ago</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50">
                  <button className="w-full text-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Profile Dropdown */}
          <div className="relative ml-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 text-xs font-bold text-white ring-2 ring-white dark:ring-slate-900 overflow-hidden">
                {logo ? (
                  <img 
                    src={logo.startsWith('http') ? logo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${logo}`}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(businessName)
                )}
              </div>
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight max-w-[100px] truncate">
                  {businessName || 'Restaurant'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                  {profile?.subscriptionTier || 'Basic'} Plan
                </span>
              </div>
              <ChevronRight className="hidden lg:block h-4 w-4 text-slate-400 rotate-90" />
            </button>

            {showProfile && (
              <div 
                className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 bg-gradient-to-br from-secondary-400 to-secondary-600">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white overflow-hidden">
                      {logo ? (
                        <img 
                          src={logo.startsWith('http') ? logo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${logo}`}
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(businessName)
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white truncate max-w-[140px]">
                        {businessName || 'Your Restaurant'}
                      </p>
                      <p className="text-xs text-white/80 mt-0.5 capitalize">
                        {profile?.subscriptionTier || 'Basic'} Plan
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setShowProfile(false)}
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    Settings
                  </Link>
                  <Link
                    href="/subscription"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setShowProfile(false)}
                  >
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    Subscription
                  </Link>
                  <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      logout();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumb Bar */}
      <div className="h-14 flex items-center gap-4 px-4 md:px-6 lg:px-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.slice(1).map((crumb) => (
            <div key={crumb.href} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1 text-slate-300 dark:text-slate-600" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {crumb.name}
              </span>
            </div>
          ))}
        </nav>

        {/* Page Title */}
        <div className="ml-auto">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {pageTitle}
          </h1>
        </div>
      </div>
    </header>
  );
}
