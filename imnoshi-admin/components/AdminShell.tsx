'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/BrandLogo';
import {
  LayoutDashboard,
  Users,
  ArrowDownLeft,
  Gift,
  Activity,
  Cpu,
  ScrollText,
  Wallet,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV = [
  { label: 'Overview',     href: '/',             icon: LayoutDashboard },
  { label: 'Users',        href: '/users',        icon: Users },
  { label: 'Devices',      href: '/devices',      icon: Cpu },
  { label: 'Withdrawals',  href: '/withdrawals',  icon: ArrowDownLeft },
  { label: 'Rewards',      href: '/rewards',      icon: Gift },
  { label: 'Fleet Stats',  href: '/fleet',        icon: Activity },
  { label: 'Balance',      href: '/balance',      icon: Wallet },
  { label: 'Audit Log',    href: '/audit',        icon: ScrollText },
  { label: 'Settings',     href: '/settings',     icon: Settings },
];

export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-out failed');
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border">
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <BrandLogo size={46} showWordmark={false} />
          <div>
            <p className="live-brand font-space font-bold">IMNOSHI</p>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <p className="px-3 text-xs text-muted-foreground truncate" title={email}>
            {email}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={signOut}
            disabled={signingOut}
          >
            <LogOut size={14} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top nav */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto border-b border-border px-3 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm whitespace-nowrap',
                pathname === item.href ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-border">
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          <Button variant="ghost" size="sm" onClick={signOut} disabled={signingOut} className="gap-1">
            <LogOut size={14} />
            Sign out
          </Button>
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

