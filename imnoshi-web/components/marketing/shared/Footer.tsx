import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t border-border/10 bg-background py-12">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground">
              I
            </div>
            <span className="font-space font-bold text-foreground text-lg">{APP_NAME}</span>
          </div>
          <p className="text-foreground/50 text-sm max-w-sm">
            Decentralised GPU compute, quant trading, and staking infrastructure built for the next era of digital yield.
          </p>
        </div>

        <div>
          <h4 className="text-foreground font-semibold mb-4">Product</h4>
          <ul className="space-y-2 text-sm text-foreground/50">
            <li><a href="#engines" className="hover:text-primary">Engines</a></li>
            <li><a href="#pricing" className="hover:text-primary">Pricing</a></li>
            <li><Link href="/dashboard" className="hover:text-primary">Dashboard</Link></li>
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
