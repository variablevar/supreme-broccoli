'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '@/lib/constants';
import { MagneticButton } from '@/components/shared/MagneticButton';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground">
            I
          </div>
          <span className="font-space font-bold text-foreground text-lg">Imnoshi</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.filter((l) => !l.href.startsWith('/')).map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-foreground/70 hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            className="text-sm text-foreground/70 hover:text-primary transition-colors"
          >
            Sign In
          </Link>
          <MagneticButton className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
            Get Started
          </MagneticButton>
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden glass-strong border-t border-border/10 px-6 py-4 space-y-4">
          {NAV_LINKS.filter((l) => !l.href.startsWith('/')).map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block text-foreground/70 hover:text-primary"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link href="/login" className="block text-foreground/70 hover:text-primary">
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}
