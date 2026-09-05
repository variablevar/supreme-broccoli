'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface VipToggleProps {
  userId: string;
  initial: boolean;
  email: string;
}

/**
 * Inline VIP toggle used on the users list. Calls
 * /admin/api/users/[id]/vip (full-admin only). Re-fetches by
 * reloading the page on success.
 */
export function VipToggle({ userId, initial, email }: VipToggleProps) {
  const [vip, setVip] = useState(initial);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    const next = !vip;
    const reason = window.prompt(
      `Reason for marking ${email} as ${next ? 'VIP' : 'Standard'}?`,
      next ? 'Manual grant' : 'Manual revoke'
    );
    if (!reason) return;
    setBusy(true);
    try {
      const res = await fetch(`/admin/api/users/${userId}/vip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vip: next, reason }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Update failed');
      }
      setVip(next);
      toast.success(`${email} ${next ? 'promoted to VIP' : 'removed from VIP'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={vip ? 'destructive' : 'default'} size="sm" onClick={onClick} disabled={busy}>
      {vip ? 'Revoke VIP' : 'Grant VIP'}
    </Button>
  );
}
