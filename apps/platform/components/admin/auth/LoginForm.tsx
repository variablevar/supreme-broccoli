'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const LOCKOUT_MINUTES = 15;

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
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        if (data?.reason === 'locked') {
          toast.error(`Account locked. Try again in ${LOCKOUT_MINUTES} minutes.`);
        } else if (data?.reason === 'bad_password') {
          toast.error(
            (data.error as string) ||
              'Wrong password. For first login the shared password is your provisioned password.'
          );
        } else if (data?.reason === 'unknown_email') {
          toast.error(
            (data.error as string) ||
              'No admin account with that email. Allowed addresses are set via ADMIN_EMAILS.'
          );
        } else if (data?.reason === 'not_allowlisted') {
          toast.error('This account is not on the admin allowlist.');
        } else {
          toast.error((data?.error as string) ?? 'Sign-in failed');
        }
        return;
      }
      const stage = data.stage as 'reset' | 'totp' | 'done';
      if (stage === 'reset') {
        router.replace('/admin/login/setup');
      } else if (stage === 'totp') {
        router.replace('/admin/login/verify');
      } else {
        router.replace('/admin');
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
    </form>
  );
}