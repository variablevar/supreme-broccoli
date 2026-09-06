'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props {
  email: string;
}

export function VerifyForm({ email }: Props) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter the 6-digit code from Google Authenticator');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode: code }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((j.error as string) ?? 'Invalid code');
        return;
      }
      toast.success('Signed in');
      router.replace('/admin');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Signed in as <span className="font-mono text-foreground">{email}</span>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Authenticator code</Label>
        <Input
          id="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoFocus
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          disabled={busy}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Verifying…' : 'Verify'}
      </Button>
      <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={logout}>
        Cancel (sign out)
      </Button>
    </form>
  );
}