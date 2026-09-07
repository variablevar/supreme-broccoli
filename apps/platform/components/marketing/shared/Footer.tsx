import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import { BrandLogo } from '@/components/shared/BrandLogo';

export function Footer() {
  return (
    <footer className="relative border-t border-border/10 bg-background py-12">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-4">
            <BrandLogo size={48} />
          </div>
          <p className="text-foreground/50 text-sm max-w-sm">
            Dedicated monitor nodes connected to GPU compute, quant workloads, reward distribution and USDT settlement.
          </p>
        </div>

        <div>
          <h4 className="text-foreground font-semibold mb-4">Product</h4>
          <ul className="space-y-2 text-sm text-foreground/50">
            <li><Link href="/#engines" className="hover:text-primary">Engines</Link></li>
            <li><Link href="/#pricing" className="hover:text-primary">Monitor Node</Link></li>
            <li><Link href="/dashboard" className="hover:text-primary">Dashboard</Link></li>
            <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-foreground font-semibold mb-4">Account</h4>
          <ul className="space-y-2 text-sm text-foreground/50">
            <li><Link href="/login" className="hover:text-primary">Sign In</Link></li>
            <li><Link href="/register" className="hover:text-primary">Register</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-border/10 text-xs text-foreground/30">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
