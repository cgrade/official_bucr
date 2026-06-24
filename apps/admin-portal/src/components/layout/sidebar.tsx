'use client';

/**
 * Admin Portal Sidebar — pure BUCR brand palette
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Store, CreditCard, BarChart3,
  Settings, LogOut, Bell, FileText, Calendar,
  ChevronRight, ChevronLeft, Star, X, Map, TrendingUp, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BucrWordmark } from '@/components/ui/BucrWordmark';

const NAV = [
  { name: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { name: 'Users',        href: '/users',        icon: Users },
  { name: 'Vendors',      href: '/vendors',      icon: Store },
  { name: 'Vendor Map',   href: '/vendors/map',  icon: Map },
  { name: 'Documents',    href: '/documents',    icon: FileText },
  { name: 'Reservations', href: '/reservations', icon: Calendar },
  { name: 'Reviews',      href: '/reviews',      icon: Star },
  { name: 'Credits',      href: '/credits',      icon: CreditCard },
  { name: 'Featured',     href: '/featured',     icon: Star },
  { name: 'Analytics',    href: '/analytics',    icon: BarChart3 },
  { name: 'Revenue',      href: '/revenue',      icon: TrendingUp },
];

const BOTTOM_NAV = [
  { name: 'Admins',        href: '/admins',        icon: ShieldCheck },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings',      href: '/settings',      icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

const SIDEBAR_BG  = 'bg-[#0f2547]';
const BORDER      = 'border-[rgba(201,168,76,0.18)]';
const LINK_BASE   = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium tracking-[0.02em] transition-all duration-150 w-full';
const LINK_ACTIVE = 'bg-[rgba(201,168,76,0.12)] text-[#c9a84c] border-l-2 border-[#c9a84c] -ml-px pl-[calc(0.75rem+1px)]';
const LINK_IDLE   = 'text-[rgba(245,240,232,0.55)] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.05)]';

export function Sidebar({ isOpen = true, isCollapsed = false, onClose, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { admin, logout } = useAuthStore();

  const sidebarContent = (
    <>
      {/* Admin badge */}
      {!isCollapsed && (
        <div className="mx-3 my-3 p-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.18)]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c9a84c] text-[11px] font-bold text-[#0f2547] flex-shrink-0">
              {admin?.name ? admin.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[12px] font-semibold text-[#f5f0e8]">{admin?.name || 'Admin'}</p>
              <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-[#c9a84c]">Platform Admin</p>
            </div>
          </div>
        </div>
      )}

      {/* Section label */}
      {!isCollapsed && (
        <p className="px-4 pb-1.5 text-[9px] font-semibold tracking-[0.2em] uppercase text-[rgba(201,168,76,0.5)]">
          Platform
        </p>
      )}

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} onClick={onClose}
              className={cn(LINK_BASE, active ? LINK_ACTIVE : LINK_IDLE, isCollapsed && 'justify-center px-2')}>
              <item.icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-[#c9a84c]' : 'text-[rgba(245,240,232,0.4)]')} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className={cn('border-t pt-2 pb-3', BORDER, isCollapsed ? 'px-2' : 'px-2')}>
        {!isCollapsed && (
          <p className="px-2 pb-1.5 text-[9px] font-semibold tracking-[0.2em] uppercase text-[rgba(201,168,76,0.5)]">Account</p>
        )}
        {BOTTOM_NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} onClick={onClose}
              className={cn(LINK_BASE, active ? LINK_ACTIVE : LINK_IDLE, isCollapsed && 'justify-center px-2')}>
              <item.icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-[#c9a84c]' : 'text-[rgba(245,240,232,0.4)]')} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
        <div className="my-2 border-t border-[rgba(201,168,76,0.1)]" />
        <button onClick={logout}
          className={cn(LINK_BASE, 'text-[rgba(239,68,68,0.7)] hover:text-[#f87171] hover:bg-[rgba(239,68,68,0.08)]', isCollapsed && 'justify-center px-2')}>
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && onClose && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[rgba(7,15,30,0.75)] backdrop-blur-sm lg:hidden"
            onClick={onClose} />
        )}
      </AnimatePresence>

      {/* Mobile */}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 flex flex-col border-r transition-transform duration-300 lg:hidden',
        SIDEBAR_BG, BORDER, isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className={cn('flex items-center justify-between p-4 border-b', BORDER)}>
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#c9a84c]">Admin</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7a8fa6] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.05)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop */}
      <aside className={cn(
        'hidden lg:flex flex-col border-r flex-shrink-0 relative transition-all duration-300',
        SIDEBAR_BG, BORDER, isCollapsed ? 'w-14' : 'w-60'
      )}>
        {onToggleCollapse && (
          <button onClick={onToggleCollapse}
            className="absolute -right-3 top-6 z-10 h-6 w-6 flex items-center justify-center rounded-full border border-[rgba(201,168,76,0.28)] bg-[#0f2547] shadow-md hover:bg-[rgba(201,168,76,0.1)] transition-colors">
            {isCollapsed
              ? <ChevronRight className="h-3 w-3 text-[#c9a84c]" />
              : <ChevronLeft  className="h-3 w-3 text-[#c9a84c]" />}
          </button>
        )}

        {/* Logo area */}
        <div className={cn('flex items-center px-4 py-5', isCollapsed ? 'justify-center px-2' : 'gap-0')}>
          {isCollapsed ? (
            <svg width="24" height="24" viewBox="0 0 60 60">
              <text x="2" y="48" fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="52" fill="#c9a84c">B</text>
            </svg>
          ) : (
            <div>
              <BucrWordmark height={38} />
              <span className="block text-[8px] font-sans font-semibold tracking-[0.2em] uppercase text-[#7a8fa6] mt-0.5 pl-0.5">Admin Portal</span>
            </div>
          )}
        </div>
        <div className={cn('border-t mb-2', BORDER)} />
        {sidebarContent}
      </aside>
    </>
  );
}
