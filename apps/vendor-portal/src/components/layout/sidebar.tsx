'use client';

/**
 * Vendor Portal Sidebar
 *  - Orders and Events removed (coming soon as future upgrades)
 *  - Pro / Elite tier badges on locked features
 *  - Clicking a locked item navigates normally — FeatureGate on each page handles the paywall
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { settingsApi } from '@/lib/api';
import { BucrWordmark } from '@/components/ui/BucrWordmark';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, QrCode, CalendarCheck,
  Users, UtensilsCrossed, ImageIcon, Star, BarChart3,
  Settings, LogOut, CreditCard, Sparkles,
  ChevronRight, ChevronLeft, Wallet, X, Shield, Smartphone, Tag, Award, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { canAccess, normalizeTier, FEATURE_TIERS, type FeatureId, TIER_LABEL } from '@/lib/features';

// ── Nav definition ─────────────────────────────────────────────────────────
// Orders and Events are intentionally omitted — coming soon as paid upgrades.
const NAV: Array<{ name: string; href: string; icon: React.ElementType; feature: FeatureId }> = [
  { name: 'Dashboard',       href: '/dashboard',       icon: LayoutDashboard, feature: 'dashboard'        },
  { name: 'Reservations',    href: '/reservations',    icon: CalendarCheck,   feature: 'reservations'     },
  { name: 'QR Scanner',      href: '/scanner',         icon: QrCode,          feature: 'scanner'          },
  { name: 'Menu',            href: '/menu',            icon: UtensilsCrossed, feature: 'menu'             },
  { name: 'Gallery',         href: '/gallery',         icon: ImageIcon,       feature: 'gallery'          },
  { name: 'Reviews',         href: '/reviews',         icon: Star,            feature: 'reviews'          },
  // ── Pro ────────────────────────────────────────────────────────────────
  { name: 'Analytics',       href: '/analytics',       icon: BarChart3,       feature: 'analytics'        },
  { name: 'Guest Profiles',  href: '/guests',          icon: Users,           feature: 'guest_profiles'   },
  { name: 'Special Offers',  href: '/special-offers',  icon: Tag,             feature: 'special_offers'   },
  { name: 'Experiences',     href: '/experiences',     icon: Sparkles,        feature: 'experiences'      },
  // ── Elite ──────────────────────────────────────────────────────────────
  { name: 'Achievements',    href: '/achievements',    icon: Award,           feature: 'achievements'     },
  { name: 'Featured Spots',  href: '/featured',        icon: Star,            feature: 'featured'         },
  { name: 'Display Settings',href: '/display-settings',icon: Smartphone,      feature: 'display_settings' },
];

const BOTTOM_NAV = [
  { name: 'KYC Documents', href: '/documents',    icon: Shield    },
  { name: 'Team',           href: '/team',         icon: Users     },
  { name: 'Credits',        href: '/credits',      icon: Wallet    },
  { name: 'Subscription',   href: '/subscription', icon: CreditCard},
  { name: 'Settings',       href: '/settings', icon: Settings  },
];

// ── Tier badge colours ─────────────────────────────────────────────────────
const TIER_PILL: Record<string, string> = {
  pro:   'bg-[rgba(201,168,76,0.18)] text-[#c9a84c]',
  elite: 'bg-[#c9a84c] text-[#0f2547]',
};

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
  const { vendor, logout } = useAuthStore();

  const { data: profileData } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: () => settingsApi.getProfile(),
    staleTime: 10_000,
  });

  const profile      = profileData?.data;
  const businessName = profile?.businessName || vendor?.businessName;
  const logo         = profile?.logo;
  const currentTier  = normalizeTier(profile?.subscriptionTier || vendor?.subscriptionTier);

  const initials = (name?: string) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'V';

  /** Render a single nav item with optional tier badge */
  function NavItem({ item, collapsed }: { item: typeof NAV[0]; collapsed: boolean }) {
    const active  = pathname === item.href || pathname.startsWith(item.href + '/');
    const allowed  = canAccess(currentTier, item.feature);
    const required = FEATURE_TIERS[item.feature] as string;
    const showBadge = required !== 'basic' && !collapsed;

    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          LINK_BASE,
          active  ? LINK_ACTIVE : LINK_IDLE,
          !allowed && 'opacity-60',
          collapsed && 'justify-center px-2'
        )}
      >
        <item.icon className={cn('h-4 w-4 flex-shrink-0',
          active   ? 'text-[#c9a84c]' :
          !allowed ? 'text-[rgba(245,240,232,0.3)]' :
                     'text-[rgba(245,240,232,0.4)]')} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {!allowed && <Lock className="h-3 w-3 text-[rgba(201,168,76,0.4)] flex-shrink-0" />}
            {allowed && showBadge && (
              <span className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded tracking-[0.1em] uppercase flex-shrink-0',
                TIER_PILL[required] ?? 'bg-[rgba(255,255,255,0.08)] text-[#7a8fa6]')}>
                {required}
              </span>
            )}
            {!allowed && showBadge && (
              <span className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded tracking-[0.1em] uppercase flex-shrink-0',
                TIER_PILL[required] ?? 'bg-[rgba(255,255,255,0.08)] text-[#7a8fa6]')}>
                {TIER_LABEL[required as keyof typeof TIER_LABEL] ?? required}
              </span>
            )}
          </>
        )}
      </Link>
    );
  }

  const sidebarContent = (
    <>
      {/* Vendor badge */}
      {!isCollapsed && (
        <div className="mx-3 my-3 p-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.18)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2547] text-sm font-bold text-[#f5f0e8] border border-[rgba(201,168,76,0.28)] overflow-hidden flex-shrink-0">
              {logo ? (
                <img src={logo.startsWith('http') ? logo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${logo}`}
                  alt="" className="w-full h-full object-cover" />
              ) : initials(businessName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#f5f0e8]">
                {businessName || 'Your Restaurant'}
              </p>
              <span className={cn('inline-block text-[9px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 rounded mt-0.5',
                currentTier === 'elite' ? 'bg-[#c9a84c] text-[#0f2547]' :
                currentTier === 'pro'   ? 'bg-[rgba(201,168,76,0.18)] text-[#c9a84c]' :
                                          'bg-[rgba(255,255,255,0.06)] text-[#7a8fa6]')}>
                {TIER_LABEL[currentTier]} Plan
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed avatar */}
      {isCollapsed && (
        <div className="flex justify-center py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.28)] text-sm font-bold text-[#f5f0e8] overflow-hidden">
            {logo ? (
              <img src={logo.startsWith('http') ? logo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${logo}`}
                alt="" className="w-full h-full object-cover" />
            ) : initials(businessName)}
          </div>
        </div>
      )}

      {/* Section: Core */}
      {!isCollapsed && (
        <p className="px-4 pb-1.5 text-[9px] font-semibold tracking-[0.2em] uppercase text-[rgba(201,168,76,0.5)]">
          Operations
        </p>
      )}

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {NAV.map(item => (
          <NavItem key={item.href} item={item} collapsed={isCollapsed} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className={cn('border-t pt-2 pb-3', BORDER, isCollapsed ? 'px-2' : 'px-2')}>
        {!isCollapsed && (
          <p className="px-2 pb-1.5 text-[9px] font-semibold tracking-[0.2em] uppercase text-[rgba(201,168,76,0.5)]">Account</p>
        )}
        {BOTTOM_NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href.replace('/index', ''));
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

      {/* Mobile drawer */}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-72 flex flex-col border-r transition-transform duration-300 ease-in-out lg:hidden',
        SIDEBAR_BG, BORDER, isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className={cn('flex items-center justify-between p-4 border-b', BORDER)}>
          <span className="text-[13px] font-semibold tracking-[0.15em] uppercase text-[#c9a84c]">Menu</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7a8fa6] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.05)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col border-r flex-shrink-0 relative transition-all duration-300',
        SIDEBAR_BG, BORDER, isCollapsed ? 'w-16' : 'w-64'
      )}>
        {onToggleCollapse && (
          <button onClick={onToggleCollapse}
            className="absolute -right-3 top-6 z-10 h-6 w-6 flex items-center justify-center rounded-full border border-[rgba(201,168,76,0.28)] bg-[#0f2547] shadow-md hover:bg-[rgba(201,168,76,0.1)] transition-colors">
            {isCollapsed
              ? <ChevronRight className="h-3 w-3 text-[#c9a84c]" />
              : <ChevronLeft  className="h-3 w-3 text-[#c9a84c]" />}
          </button>
        )}

        {/* Logo */}
        <div className={cn('flex items-center px-4 py-5', isCollapsed ? 'justify-center px-2' : 'gap-0')}>
          {isCollapsed ? (
            <svg width="24" height="24" viewBox="0 0 60 60">
              <text x="2" y="48" fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="52" fill="#c9a84c">B</text>
            </svg>
          ) : (
            <div>
              <BucrWordmark height={38} />
              <span className="block text-[8px] font-sans font-semibold tracking-[0.2em] uppercase text-[#7a8fa6] mt-0.5 pl-0.5">Vendor Portal</span>
            </div>
          )}
        </div>
        <div className={cn('border-t mb-2', BORDER)} />
        {sidebarContent}
      </aside>
    </>
  );
}
