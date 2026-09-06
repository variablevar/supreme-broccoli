'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        if (data?.reason === 'locked') {
          toast.error('Account locked. Try again in 15 minutes.');
        } else if (data?.reason === 'bad_password') {
          // The server returns a more specific hint for this case.
          toast.error(
            (data.error as string) ||
              'Wrong password. For seeded demo accounts the password is your password.'
          );
        } else if (data?.reason === 'unknown_email') {
          toast.error(
            (data.error as string) ||
              'No account found. Sign in with your @imnoshi.com email (not your UID).'
          );
        } else if (data?.reason === 'no_app_user') {
          toast.error('Account exists but has no profile row yet. Contact support.');
        } else if (data?.reason === 'table_missing') {
          toast.error('web_users table missing. Apply migration 20260907120000.');
        } else {
          toast.error((data?.error as string) ?? 'Sign-in failed');
        }
        return;
      }
      const stage = data.stage as 'totp' | 'done';
      if (stage === 'totp') {
        router.replace('/login/verify');
      } else {
        router.replace('/dashboard');
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
      <details className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none font-medium text-foreground">
          Seeded demo accounts
        </summary>
        <p className="mt-2">
          Sign in with your <span className="font-mono">@imnoshi.com</span> email,
          not the UID. Seeded passwords follow{' '}
          <span className="font-mono">&lt;FirstName&gt;-2026!</span>.
        </p>
        <ul className="mt-2 space-y-0.5 font-mono">
          <li>alex.carter@imnoshi.com / Carter-2026!</li>
          <li>priya.sharma@imnoshi.com / Sharma-2026! <span className="text-amber-600">(2FA enrolled)</span></li>
          <li>marcus.tan@imnoshi.com / Tan-2026!</li>
          <li>elena.rossi@imnoshi.com / Rossi-2026!</li>
          <li>yuki.tanaka@imnoshi.com / Tanaka-2026!</li>
          <li>aisha.mensah@imnoshi.com / Mensah-2026!</li>
          <li>diego.alvarez@imnoshi.com / Alvarez-2026!</li>
        </ul>
      </details>
      <p className="text-center text-sm text-muted-foreground pt-2">
        New here?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}