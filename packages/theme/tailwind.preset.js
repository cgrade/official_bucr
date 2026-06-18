/**
 * BUCR Tailwind CSS Preset
 * ========================
 * Shared Tailwind configuration for all BUCR apps
 * Import this in each app's tailwind.config.ts
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary - Deep Midnight (Dark, Premium, Structural)
        primary: {
          50: '#f0f0f4',
          100: '#dddde6',
          200: '#b8b8cc',
          300: '#8e8eaf',
          400: '#545470',
          500: '#1a1a2e',
          600: '#151527',
          700: '#111120',
          800: '#0d0d19',
          900: '#090912',
          950: '#05050b',
        },
        // Secondary - Dark Navy (Trust, Authority)
        secondary: {
          50: '#eef1f7',
          100: '#d4dae8',
          200: '#a9b5d1',
          300: '#7d8fb9',
          400: '#4a6198',
          500: '#16213e',
          600: '#121b33',
          700: '#0e1528',
          800: '#0a0f1d',
          900: '#060a13',
          950: '#030509',
        },
        // Tertiary - Warm Gold (Highlights, CTAs)
        tertiary: {
          50: '#fefaf4',
          100: '#fdf3e3',
          200: '#fbe5c2',
          300: '#f7d49a',
          400: '#f3c88b',
          500: '#efc07b',
          600: '#d4a35e',
          700: '#b08246',
          800: '#8c6535',
          900: '#6d4f2a',
          950: '#4a3519',
        },
        // Semantic
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glow-primary': '0 4px 14px rgba(26, 26, 46, 0.4)',
        'glow-secondary': '0 4px 14px rgba(22, 33, 62, 0.4)',
        'glow-tertiary': '0 4px 14px rgba(239, 192, 123, 0.4)',
        'glow-success': '0 4px 14px rgba(16, 185, 129, 0.4)',
        'glow-error': '0 4px 14px rgba(239, 68, 68, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        'gradient-tertiary': 'linear-gradient(135deg, #efc07b 0%, #d4a35e 100%)',
        'gradient-success': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
