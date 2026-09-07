'use client';

import { useEffect } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';

export function ThemeRuntime() {
  const theme = useDashboardStore((state) => state.theme);

  useEffect(() => {
    localStorage.removeItem('gt-quant-dashboard');
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = theme === 'dark' || (theme === 'system' && systemDark);
    root.classList.toggle('dark', useDark);
  }, [theme]);

  return null;
}
