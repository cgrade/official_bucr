/**
 * ThemeContext — exact palette from bucr.ng production site
 *
 * ink    #070f1e  deepest background
 * navy   #0f2547  primary brand navy
 * navy2  #1a3c6e  elevated surface navy
 * gold   #c9a84c  Heritage Gold (CTAs, accents)
 * gold-d #a07830  dark gold (hover)
 * gold-l #e8d49a  light gold (shimmer)
 * cream  #f5f0e8  primary text on dark
 * muted  #7a8fa6  secondary text
 *
 * Fonts: Cormorant Garamond (display) + Jost (body)
 */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeColors {
  background: string; surface: string; card: string; cardElevated: string;
  modal: string; overlay: string;
  text: string; textSecondary: string; textMuted: string;
  textOnPrimary: string; textOnImage: string;
  border: string; borderLight: string;
  primary: string; primaryLight: string; primaryDark: string;
  secondary: string; secondaryLight: string;
  tertiary: string; tertiaryLight: string; tertiaryDark: string;
  success: string; successLight: string;
  error: string; errorLight: string;
  warning: string; warningLight: string;
  info: string; infoLight: string;
  gradientStart: string; gradientEnd: string;
  tabBarBackground: string; headerBackground: string;
  inputBackground: string; shimmer: string; badge: string;
}

// ── Dark theme (matches bucr.ng — the app is primarily dark) ─────────────
//   Depth hierarchy: ink(bg) → navy(card/surface) → navy2(elevated) → gold(CTA)
//   Using ink as screen background so navy cards/buttons have visible contrast.
export const darkTheme: ThemeColors = {
  background:     '#070f1e',  // ink — screen background (tab bar / header match)
  surface:        '#0f2547',  // navy — sheets, bottom bars
  card:           '#0f2547',  // navy — cards (visually elevated from ink bg)
  cardElevated:   '#1a3c6e',  // navy2 — elevated/highlighted cards
  modal:          '#0f2547',
  overlay:        'rgba(7,15,30,0.82)',

  text:           '#f5f0e8',  // cream — primary text
  textSecondary:  '#c9a84c',  // gold — section headers, labels
  textMuted:      '#7a8fa6',  // muted — helper text, timestamps
  textOnPrimary:  '#f5f0e8',  // cream on navy
  textOnImage:    '#f5f0e8',

  border:         'rgba(201,168,76,0.25)',
  borderLight:    'rgba(201,168,76,0.13)',

  primary:        '#0f2547',  // navy — structural primary (buttons visible on ink bg now)
  primaryLight:   '#1a3c6e',  // navy2
  primaryDark:    '#070f1e',  // ink

  secondary:      '#1a3c6e',  // navy2
  secondaryLight: 'rgba(26,60,110,0.4)',

  tertiary:       '#c9a84c',  // gold — Hero CTA colour
  tertiaryLight:  'rgba(201,168,76,0.15)',  // subtle gold tint bg
  tertiaryDark:   '#a07830',  // gold-d

  success:        '#4ade80', successLight: 'rgba(74,222,128,0.15)',
  error:          '#f87171', errorLight:   'rgba(248,113,113,0.15)',
  warning:        '#fbbf24', warningLight: 'rgba(251,191,36,0.15)',
  info:           '#7a8fa6', infoLight:    'rgba(122,143,166,0.15)',

  gradientStart:  '#0f2547',  // navy
  gradientEnd:    '#c9a84c',  // gold

  tabBarBackground:  '#070f1e',  // ink (unchanged)
  headerBackground:  '#070f1e',  // ink (unchanged)
  inputBackground:   'rgba(255,255,255,0.06)',
  shimmer:           'rgba(201,168,76,0.08)',
  badge:             '#c9a84c',  // gold
};

// ── Light theme ────────────────────────────────────────────────────────────
export const lightTheme: ThemeColors = {
  background:     '#f5f0e8',  // cream — warm off-white
  surface:        '#ffffff',
  card:           '#ffffff',
  cardElevated:   '#fdf9f4',
  modal:          '#ffffff',
  overlay:        'rgba(7,15,30,0.45)',

  text:           '#070f1e',  // ink — primary text on light
  textSecondary:  '#0f2547',  // navy
  textMuted:      '#7a8fa6',  // muted
  textOnPrimary:  '#f5f0e8',  // cream on navy/dark
  textOnImage:    '#f5f0e8',

  border:         'rgba(15,37,71,0.15)',
  borderLight:    'rgba(15,37,71,0.08)',

  primary:        '#0f2547',  // navy
  primaryLight:   '#edf2f9',
  primaryDark:    '#070f1e',  // ink

  secondary:      '#1a3c6e',  // navy2
  secondaryLight: '#eef2f7',

  tertiary:       '#c9a84c',  // gold
  tertiaryLight:  '#fdf8ee',
  tertiaryDark:   '#a07830',  // gold-d

  success:        '#10B981', successLight: '#ECFDF5',
  error:          '#EF4444', errorLight:   '#FEF2F2',
  warning:        '#F59E0B', warningLight: '#FFFBEB',
  info:           '#1a3c6e', infoLight:    '#eef2f7',

  gradientStart:  '#0f2547',
  gradientEnd:    '#c9a84c',

  tabBarBackground:  '#ffffff',
  headerBackground:  '#f5f0e8',
  inputBackground:   '#edf2f9',
  shimmer:           'rgba(201,168,76,0.1)',
  badge:             '#c9a84c',
};

interface ThemeContextType {
  theme: Theme; setTheme: (t: Theme) => void; colors: ThemeColors; isDark: boolean;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sys = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme').then((v) => {
      if (v && ['light', 'dark', 'system'].includes(v)) setThemeState(v as Theme);
      setLoaded(true);
    });
  }, []);

  const setTheme = useCallback(async (t: Theme) => {
    setThemeState(t);
    await AsyncStorage.setItem('theme', t);
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && sys === 'dark');
  const colors = isDark ? darkTheme : lightTheme;
  const value  = useMemo(() => ({ theme, setTheme, colors, isDark }), [theme, setTheme, colors, isDark]);

  if (!loaded) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
};
