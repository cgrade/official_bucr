'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { settingsApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  QrCode,
  CalendarCheck,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  ImageIcon,
  Star,
  BarChart3,
  Settings,
  LogOut,
  CreditCard,
  Sparkles,
  Ticket,
  ChevronRight,
  ChevronLeft,
  Wallet,
  X,
  Shield,
  Smartphone,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'QR Scanner', href: '/scanner', icon: QrCode, highlight: true },
  { name: 'Reservations', href: '/reservations', icon: CalendarCheck },
  { name: 'Orders', href: '/orders', icon: ShoppingBag },
  { name: 'Guest Profiles', href: '/guests', icon: Users },
  { name: 'Menu', href: '/menu', icon: UtensilsCrossed },
  { name: 'Experiences', href: '/experiences', icon: Sparkles },
  { name: 'Events', href: '/events', icon: Ticket },
  { name: 'Special Offers', href: '/special-offers', icon: Tag },
  { name: 'Featured Spots', href: '/featured', icon: Star, highlight: true },
  { name: 'Gallery', href: '/gallery', icon: ImageIcon },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Display Settings', href: '/display-settings', icon: Smartphone },
];

const bottomNavigation = [
  { name: 'KYC Documents', href: '/documents', icon: Shield },
  { name: 'Credits', href: '/credits', icon: Wallet },
  { name: 'Subscription', href: '/subscription', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen = true, isCollapsed = false, onClose, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { vendor, logout } = useAuthStore();

  // Fetch fresh profile data from database (logo, businessName, etc.)
  const { data: profileData } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: () => settingsApi.getProfile(),
    staleTime: 10000, // 10 seconds
  });

  // Use fresh data from API, fallback to auth store
  const profile = profileData?.data;
  const businessName = profile?.businessName || vendor?.businessName;
  const logo = profile?.logo;
  const subscriptionTier = profile?.subscriptionTier || vendor?.subscriptionTier;

  const getInitials = (name?: string) => {
    if (!name) return 'V';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-72';

  const sidebarContent = (
    <>
      {/* Vendor Info Card */}
      {!isCollapsed && (
        <div className="mx-3 my-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50 p-3 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-secondary-400 to-secondary-600 text-sm font-bold text-white shadow-md overflow-hidden">
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
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {businessName || 'Your Restaurant'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">
                  {subscriptionTier || 'Basic'} Plan
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn('flex-1 space-y-0.5 overflow-y-auto', isCollapsed ? 'px-2' : 'px-2')}>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'sidebar-link group',
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-primary-500' : 'text-slate-400 group-hover:text-primary-500')} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className={cn('border-t border-slate-200 dark:border-slate-800 pt-2 pb-3', isCollapsed ? 'px-2' : 'px-2')}>
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'sidebar-link group',
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-primary-500' : 'text-slate-400 group-hover:text-primary-500')} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* Logout */}
        <button
          onClick={logout}
          className={cn(
            'sidebar-link group text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 w-full',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && onClose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
          <span className="text-lg font-bold text-slate-900 dark:text-white">Menu</span>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out flex-shrink-0 relative',
          sidebarWidth
        )}
      >
        {/* Collapse toggle button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="absolute -right-3 top-6 z-10 h-6 w-6 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3 text-slate-600 dark:text-slate-400" />
            ) : (
              <ChevronLeft className="h-3 w-3 text-slate-600 dark:text-slate-400" />
            )}
          </button>
        )}
        {sidebarContent}
      </aside>
    </>
  );
}
