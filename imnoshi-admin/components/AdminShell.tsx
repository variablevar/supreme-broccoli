'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, ArrowDownLeft, Gift, Activity } from 'lucide-react';

const NAV = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Withdrawals', href: '/withdrawals', icon: ArrowDownLeft },
  { label: 'Rewards', href: '/rewards', icon: Gift },
  { label: 'Fleet Stats', href: '/fleet', icon: Activity },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border">
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground">
            I
          </div>
          <div>
            <p className="font-space font-bold text-foreground">Imnoshi</p>
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
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
