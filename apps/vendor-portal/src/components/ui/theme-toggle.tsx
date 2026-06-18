'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSetTheme = useCallback((newTheme: string) => {
    setTheme(newTheme);
  }, [setTheme]);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        <div className="h-8 w-8 rounded-lg" />
        <div className="h-8 w-8 rounded-lg" />
        <div className="h-8 w-8 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 p-1">
      <button
        type="button"
        onClick={() => handleSetTheme('light')}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
          theme === 'light'
            ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-md'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
        title="Light mode"
        aria-label="Switch to light mode"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => handleSetTheme('dark')}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
          theme === 'dark'
            ? 'bg-white dark:bg-slate-700 text-primary-500 shadow-md'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
        title="Dark mode"
        aria-label="Switch to dark mode"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => handleSetTheme('system')}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
          theme === 'system'
            ? 'bg-white dark:bg-slate-700 text-tertiary-500 shadow-md'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
        title="System theme"
        aria-label="Use system theme"
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
}
