'use client';

import { Copy, Wallet, Bell, Menu } from 'lucide-react';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { LiveBrand } from '@/components/shared/LiveBrand';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useI18n } from '@/hooks/useI18n';
import { toast } from 'sonner';

export function DashboardHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, balance } = useDashboardStore();
  const { t } = useI18n();

  const copyUID = () => {
    navigator.clipboard.writeText(user.uid);
    toast.success('UID copied to clipboard');
  };

  return (
    <header className="glass-strong sticky top-0 z-50 px-4 md:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 md:gap-6 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-foreground/60 hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:flex items-center gap-3">
          <BrandLogo size={44} showWordmark={false} />
          <div>
            <h1>
              <LiveBrand compact />
            </h1>
            <p className="text-foreground/40 text-xs">{t('dashboard')}</p>
          </div>
        </div>

        <div className="hidden sm:block h-8 w-px bg-secondary" />

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-foreground/40 text-sm">UID:</span>
          <code className="text-primary font-mono text-sm truncate">{user.uid}</code>
          <button onClick={copyUID} className="text-foreground/40 hover:text-primary transition-colors shrink-0">
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="glass px-4 py-2 rounded-lg flex items-center gap-2">
          <Wallet size={16} className="text-primary" />
          <span className="text-foreground font-mono">{balance.toLocaleString()} USDT</span>
        </div>
        <button className="relative p-2 text-foreground/60 hover:text-foreground transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
        </button>
        <div className="w-10 h-10 rounded-full bg-secondary" />
      </div>
    </header>
  );
}
