'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, KeyRound, LogOut } from 'lucide-react';

interface Props {
  email: string;
  totpEnrolled: boolean;
  mustResetPassword: boolean;
  lastLoginAt: string | null;
  failedAttempts: number;
  lockedUntil: string | null;
}

export function SettingsView({
  email,
  totpEnrolled,
  mustResetPassword: _mustResetPassword,
  lastLoginAt,
  failedAttempts,
  lockedUntil,
}: Props) {
  const router = useRouter();

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 10) {
      toast.error('New password must be at least 10 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch('/api/admin/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((j.error as string) ?? 'Failed to update password');
        return;
      }
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPwBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Two-factor">
          {totpEnrolled ? (
            <Badge variant="default" className="gap-1">
              <ShieldCheck size={12} /> Enabled
            </Badge>
          ) : (
            <Badge variant="destructive">Not enrolled</Badge>
          )}
        </Stat>
        <Stat label="Failed attempts">
          <span className="font-mono text-sm">{failedAttempts}</span>
        </Stat>
        <Stat label="Last sign-in">
          <span className="text-xs">
            {lastLoginAt ? new Date(lastLoginAt).toLocaleString() : 'Never'}
          </span>
        </Stat>
      </div>

      {lockedUntil && new Date(lockedUntil).getTime() > Date.now() && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Account locked until {new Date(lockedUntil).toLocaleString()}. Contact another admin to unlock.
        </div>
      )}

      <form onSubmit={changePassword} className="space-y-4 rounded-md border border-border p-4">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-primary" />
          <p className="text-sm font-medium">Change password</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={pwBusy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={pwBusy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={pwBusy}
          />
        </div>
        <Button type="submit" disabled={pwBusy}>
          {pwBusy ? 'Saving…' : 'Update password'}
        </Button>
      </form>

      <div className="flex items-center justify-between rounded-md border border-border p-4">
        <div>
          <p className="text-sm font-medium">Two-factor (Google Authenticator)</p>
          <p className="text-xs text-muted-foreground">
            {totpEnrolled
              ? `Active for ${email}. Use the verify step at sign-in.`
              : 'Re-enroll from the first-login setup flow. Contact another admin to reset your TOTP.'}
          </p>
        </div>
        <Badge variant={totpEnrolled ? 'default' : 'secondary'}>
          {totpEnrolled ? 'Enrolled' : 'Inactive'}
        </Badge>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={logout} className="gap-2">
          <LogOut size={14} /> Sign out
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}