/**
 * BUCR Tailwind CSS Preset
 * ========================
 * Exact color system extracted from bucr.ng (live production landing page).
 * These are the authoritative design tokens — use these everywhere.
 *
 * Token    Hex       Usage
 * ──────────────────────────────────────────────────────────────
 * ink      #070f1e   Deepest background (near-black navy)
 * navy     #0f2547   Primary navy (structural, headers, buttons)
 * navy2    #1a3c6e   Lighter navy (cards, elevated surfaces)
 * gold     #c9a84c   Heritage Gold — CTAs, highlights, accents
 * gold-d   #a07830   Dark gold (hover, pressed states)
 * gold-l   #e8d49a   Light gold (shimmer, subtle glows)
 * cream    #f5f0e8   Primary text on dark backgrounds
 * muted    #7a8fa6   Secondary / muted text
 *
 * Fonts: Cormorant Garamond (display/headings) + Jost (body/UI)
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Core brand tokens (match bucr.ng exactly) ──────────────────
        ink:    '#070f1e',          // deepest bg
        navy:   '#0f2547',          // primary
        navy2:  '#1a3c6e',          // elevated surface
        gold:   '#c9a84c',          // accent / CTA
        'gold-d': '#a07830',        // gold hover / pressed
        'gold-l': '#e8d49a',        // gold light / shimmer
        cream:  '#f5f0e8',          // primary text on dark
        muted:  '#7a8fa6',

        // ── Micro-surface tokens (from Bucr-Survey --surf / --surfl) ──
        surf:   'rgba(255,255,255,0.04)',   // subtle white on navy backgrounds
        surfl:  'rgba(201,168,76,0.07)',    // subtle gold focus/active state          // secondary text

        // ── Tailwind-style scales (for compatibility with existing classes) ──
        primary: {
          50:   '#edf2f9',
          100:  '#c8d8ef',
          200:  '#a3bde5',
          300:  '#7ea3da',
          400:  '#5988d0',
          500:  '#0f2547',          // = navy
          600:  '#0c1e3a',
          700:  '#09162b',
          800:  '#060f1e',          // ≈ ink
          900:  '#030710',
          950:  '#010305',
        },
        secondary: {
          50:   '#eef2f7',
          100:  '#cdd8e9',
          200:  '#9db1d3',
          300:  '#6d8bbd',
          400:  '#3d64a7',
          500:  '#1a3c6e',          // = navy2
          600:  '#152f57',
          700:  '#102340',
          800:  '#0a172a',
          900:  '#050c15',
          950:  '#020509',
        },
        tertiary: {
          50:   '#fdf8ee',
          100:  '#f9edcc',
          200:  '#f3da99',
          300:  '#edc766',
          400:  '#e7b433',
          500:  '#c9a84c',          // = gold
          600:  '#a07830',          // = gold-d
          700:  '#7a5c24',
          800:  '#534018',
          900:  '#2b210c',
          950:  '#151006',
        },
        // Semantic
        success: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669', 700: '#047857' },
        warning: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
        error:   { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
      },

      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],   // headings
        sans:    ['Jost', 'Inter', 'system-ui', 'sans-serif'],   // body / UI
        mono:    ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },

      backgroundImage: {
        // Primary brand gradient: ink → navy (dark depth)
        'gradient-brand':    'linear-gradient(180deg, #0f2547 0%, #070f1e 100%)',
        // Accent gradient: navy → gold
        'gradient-accent':   'linear-gradient(135deg, #0f2547 0%, #c9a84c 100%)',
        // Gold shimmer
        'gradient-gold':     'linear-gradient(90deg, #e8d49a, #e8d49a 35%, #fffbe6 50%, #e8d49a 65%, #e8d49a)',
        'gradient-primary':  'linear-gradient(135deg, #0f2547 0%, #c9a84c 100%)',
        'gradient-tertiary': 'linear-gradient(135deg, #c9a84c 0%, #a07830 100%)',
        'gradient-success':  'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-radial':   'radial-gradient(var(--tw-gradient-stops))',
      },

      borderRadius: { 'xl': '0.75rem', '2xl': '1rem', '3xl': '1.5rem' },

      boxShadow: {
        'glow-gold':    '0 4px 20px rgba(201, 168, 76, 0.35)',
        'glow-navy':    '0 4px 20px rgba(15, 37, 71, 0.4)',
        'glow-ink':     '0 4px 20px rgba(7, 15, 30, 0.6)',
        'glow-success': '0 4px 14px rgba(16, 185, 129, 0.4)',
        'glow-error':   '0 4px 14px rgba(239, 68, 68, 0.4)',
      },

      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in':   'scaleIn 0.2s ease-out',
        'shimmer':    'shimmer 2s infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'float':      'float 3s ease-in-out infinite',
        'gold-shimmer': 'goldShimmer 2s ease-in-out infinite',
      },

      keyframes: {
        fadeIn:      { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:     { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown:   { '0%': { opacity: '0', transform: 'translateY(-10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:     { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer:     { '100%': { transform: 'translateX(100%)' } },
        pulseSoft:   { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        float:       { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-10px)' } },
        goldShimmer: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7', filter: 'brightness(1.2)' } },
      },
    },
  },
  plugins: [],
};
