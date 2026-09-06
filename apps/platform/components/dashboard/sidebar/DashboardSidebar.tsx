'use client';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DASHBOARD_NAV } from '@/lib/constants';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useI18n } from '@/hooks/useI18n';
import {
  LayoutDashboard,
  Wallet,
  Cpu,
  Gift,
  ArrowDownLeft,
  Receipt,
  Settings,
  Mail,
  Link2,
  Link as LinkIcon,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Wallet,
  Cpu,
  Gift,
  ArrowDownLeft,
  Receipt,
  Settings,
  Mail,
  Link2,
  // 'Link' is the name used by the constants table for "Pair Device".
  // lucide-react exports both `Link` (the http-link icon) and the
  // generic link icon we used here. Alias `Link2` so the lookup works
  // whether the data says 'Link' or 'Link2'.
  Link: LinkIcon,
};

const labelKey: Record<string, string> = {
  Overview: 'overview',
  Devices: 'devices',
  Wallets: 'wallets',
  Earnings: 'earnings',
  Withdrawals: 'withdrawals',
  Transactions: 'transactions',
  Settings: 'settings',
  Contact: 'contact',
};

// t is typed with a narrower key set than Record<string, string>;
// a per-key cast widens it just enough to accept our dynamic keys
// without losing the per-key exhaustive checks elsewhere.
function safeTranslate(t: (k: any) => string, k: string): string {
  const v = t(k);
  return v === k ? k.replace(/^./, (c) => c.toUpperCase()) : v;
}

// 'Pair Device' is a one-off admin-induced step; we don't translate
// the label.
const PAIR_LABEL = 'Pair Device';

export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const devices = useDashboardStore((s) => s.devices);
  const { t } = useI18n();

  return (
    <aside className="flex flex-col w-64 h-screen sticky top-0 glass-strong border-r border-border/10">
      <div className="p-6 flex items-center gap-3">
        <BrandLogo size={52} />
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {DASHBOARD_NAV.map((item) => {
          const Icon = iconMap[item.icon] ?? Link2;
          const active = pathname === item.href;
          const label = item.label === PAIR_LABEL ? PAIR_LABEL : safeTranslate(t, labelKey[item.label]);
          return (
            <NextLink
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-foreground/60 hover:text-foreground hover:bg-accent/5'
              )}
            >
              <Icon size={18} />
              {label}
            </NextLink>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-foreground/40 mb-2">{t('connectedDevices')}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-sm text-foreground">{devices.length}</span>
          </div>
          <p className="text-xs text-foreground/40 mt-1">
            {t('sevenDayCycle')}
          </p>
        </div>
      </div>
    </aside>
  );
}
