'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props {
  email: string;
}

interface SetupData {
  email: string;
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

export function SetupForm({ email }: Props) {
  const router = useRouter();
  const [data, setData] = useState<SetupData | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/setup', { method: 'GET' })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch(() => toast.error('Failed to load QR code'));
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 10) {
      toast.error('Password must be at least 10 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!/^\d{6}$/.test(totpCode)) {
      toast.error('Enter the 6-digit code from Google Authenticator');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, totpCode }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((j.error as string) ?? 'Setup failed');
        return;
      }
      toast.success('Account set up. Welcome!');
      router.replace('/');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Signed in as <span className="font-mono text-foreground">{email}</span>. Pick a strong password and
        scan the QR code below with Google Authenticator (or any TOTP app). Then enter the 6-digit code it
        shows to confirm enrollment.
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="rounded-md border border-border p-4 space-y-3">
        <p className="text-sm font-medium">Step 2 — Google Authenticator</p>
        {data ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.qrDataUrl}
              alt="TOTP QR code"
              className="h-44 w-44 rounded-md bg-white p-1"
              width={176}
              height={176}
            />
            <p className="text-xs text-muted-foreground break-all text-center">
              Or paste this secret manually: <span className="font-mono text-foreground">{data.secret}</span>
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Loading QR code…</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="totpCode">6-digit code from your app</Label>
          <Input
            id="totpCode"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
            disabled={busy}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={busy || !data}>
        {busy ? 'Setting up…' : 'Finish setup'}
      </Button>
    </form>
  );
}