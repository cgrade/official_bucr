/**
 * BUCR Unified Theme System
 * =========================
 * Single source of truth for all brand colors, design tokens, and styling
 * Used across: Admin Portal, Vendor Portal, User Mobile App
 */

// ============================================================================
// BRAND COLORS
// ============================================================================

export const colors = {
  // Primary Brand - Deep Midnight (Dark, Premium, Structural)
  primary: {
    50: '#f0f0f4',
    100: '#dddde6',
    200: '#b8b8cc',
    300: '#8e8eaf',
    400: '#545470',
    500: '#1a1a2e',  // Main deep midnight
    600: '#151527',
    700: '#111120',
    800: '#0d0d19',
    900: '#090912',
    950: '#05050b',
  },
  
  // Secondary Brand - Dark Navy (Trust, Authority)
  secondary: {
    50: '#eef1f7',
    100: '#d4dae8',
    200: '#a9b5d1',
    300: '#7d8fb9',
    400: '#4a6198',
    500: '#16213e',  // Main dark navy
    600: '#121b33',
    700: '#0e1528',
    800: '#0a0f1d',
    900: '#060a13',
    950: '#030509',
  },
  
  // Tertiary - Warm Gold (Highlights, CTAs, Premium warmth)
  tertiary: {
    50: '#fefaf4',
    100: '#fdf3e3',
    200: '#fbe5c2',
    300: '#f7d49a',
    400: '#f3c88b',
    500: '#efc07b',  // Main warm gold
    600: '#d4a35e',
    700: '#b08246',
    800: '#8c6535',
    900: '#6d4f2a',
    950: '#4a3519',
  },
  
  // Semantic Colors
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },
  
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  
  // Neutral - Slate (Modern, Professional)
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
} as const;

// ============================================================================
// DESIGN TOKENS
// ============================================================================

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.375rem',    // 6px
  md: '0.5rem',      // 8px
  lg: '0.75rem',     // 12px
  xl: '1rem',        // 16px
  '2xl': '1.5rem',   // 24px
  full: '9999px',
} as const;

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  },
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  glow: {
    primary: '0 4px 14px rgba(26, 26, 46, 0.4)',
    secondary: '0 4px 14px rgba(22, 33, 62, 0.4)',
    tertiary: '0 4px 14px rgba(239, 192, 123, 0.4)',
  },
} as const;

// ============================================================================
// GRADIENTS
// ============================================================================

export const gradients = {
  // Primary gradient (structural, dark premium)
  primary: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  primaryHover: 'linear-gradient(135deg, #151527 0%, #121b33 100%)',
  
  // Tertiary gradient (CTAs, buttons, highlights)
  tertiary: 'linear-gradient(135deg, #efc07b 0%, #d4a35e 100%)',
  tertiaryHover: 'linear-gradient(135deg, #d4a35e 0%, #b08246 100%)',
  
  // Success gradient
  success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  
  // Background gradients
  bgLight: 'radial-gradient(at 0% 0%, rgba(26, 26, 46, 0.06) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(239, 192, 123, 0.06) 0px, transparent 50%)',
  bgDark: 'radial-gradient(at 0% 0%, rgba(26, 26, 46, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(239, 192, 123, 0.08) 0px, transparent 50%)',
  
  // Glass effect overlay
  glass: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
} as const;

// ============================================================================
// ANIMATION
// ============================================================================

export const animation = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// ============================================================================
// BREAKPOINTS (Mobile-first)
// ============================================================================

export const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
} as const;

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
} as const;

// ============================================================================
// COMPONENT VARIANTS (for consistency across portals)
// ============================================================================

export const componentStyles = {
  // Card styles
  card: {
    base: 'rounded-2xl border transition-all duration-200',
    glass: 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-white/20 dark:border-slate-800/50 shadow-xl',
    solid: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg',
    interactive: 'hover:shadow-xl hover:scale-[1.02] cursor-pointer',
  },
  
  // Button styles
  button: {
    base: 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
    sizes: {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    },
    variants: {
      primary: 'bg-gradient-to-r from-tertiary-500 to-tertiary-600 text-primary-900 shadow-lg shadow-tertiary-500/25 hover:shadow-tertiary-500/40 hover:from-tertiary-600 hover:to-tertiary-700',
      secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700',
      outline: 'border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
      ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
      danger: 'bg-error-500 text-white hover:bg-error-600 shadow-lg shadow-error-500/25',
    },
  },
  
  // Input styles
  input: {
    base: 'w-full rounded-xl border bg-white dark:bg-slate-800 px-4 py-2.5 text-sm transition-all duration-200',
    default: 'border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
    error: 'border-error-500 focus:border-error-500 focus:ring-2 focus:ring-error-500/20',
  },
  
  // Badge styles
  badge: {
    base: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
    variants: {
      success: 'bg-success-50 text-success-700 border-success-200',
      warning: 'bg-warning-50 text-warning-700 border-warning-200',
      error: 'bg-error-50 text-error-700 border-error-200',
      info: 'bg-primary-50 text-primary-700 border-primary-200',
      neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  },
} as const;

// ============================================================================
// LAYOUT RECOMMENDATIONS
// ============================================================================

/**
 * UX Layout Recommendations for BUCR
 * ===================================
 * 
 * ## USER MOBILE APP (React Native/Expo)
 * - Bottom Tab Navigation: Home, Search, Wallet, Bookings, Profile
 * - Card-based restaurant listings with large hero images
 * - Sticky header with location + search
 * - Floating action button for quick booking
 * - Pull-to-refresh on all list screens
 * - Swipe gestures for quick actions (favorite, share)
 * - Credit balance always visible in header/wallet tab badge
 * 
 * ## VENDOR PORTAL (Desktop-first, responsive)
 * - Fixed left sidebar (collapsible on mobile)
 * - Top header with notifications + profile
 * - Dashboard with key metrics cards at top
 * - Quick action buttons in header
 * - Data tables with inline actions
 * - Modal-based forms for complex operations
 * - Toast notifications for feedback
 * 
 * ## ADMIN PORTAL (Desktop-focused)
 * - Collapsible left sidebar with icon-only mode
 * - Breadcrumb navigation
 * - Dense data tables with sorting/filtering
 * - Quick filters in sticky position
 * - Split-view for detail panels
 * - Keyboard shortcuts for power users
 * 
 * ## SHARED PATTERNS
 * - Glass morphism cards for premium feel
 * - Gradient primary buttons for CTAs
 * - Consistent 12px (lg) border radius
 * - Status badges with semantic colors
 * - Loading skeletons (not spinners) for better UX
 * - Empty states with helpful illustrations
 * - Error states with clear recovery actions
 */

export const layoutConfig = {
  // Sidebar widths
  sidebar: {
    collapsed: '80px',
    expanded: '280px',
  },
  
  // Header heights
  header: {
    mobile: '64px',
    desktop: '80px',
  },
  
  // Content max widths
  content: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    full: '100%',
  },
  
  // Mobile bottom nav
  bottomNav: {
    height: '72px',
    safeArea: '34px', // iOS safe area
  },
} as const;

// Default export for convenience
export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  gradients,
  animation,
  breakpoints,
  zIndex,
  componentStyles,
  layoutConfig,
};
