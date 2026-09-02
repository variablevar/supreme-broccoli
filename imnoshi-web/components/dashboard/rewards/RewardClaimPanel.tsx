'use client';
import { useState } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { Gift } from 'lucide-react';
import { toast } from 'sonner';

export function RewardClaimPanel() {
  const { rewards, claimReward } = useDashboardStore();
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    if (rewards.pending <= 0) {
      toast.info('No pending rewards to claim');
      return;
    }
    setClaiming(true);
    try {
      const res = await fetch('/api/rewards', { method: 'POST' });
      if (!res.ok) throw new Error('Claim failed');
      const { claimed } = await res.json();
      if (claimed > 0) {
        claimReward();
        toast.success(`Claimed $${Number(claimed).toLocaleString()} in rewards`);
      } else {
        toast.info('No pending rewards to claim');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <GlassCard className="h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Gift size={20} />
        </div>
        <h3 className="font-space font-semibold text-foreground">Claim Rewards</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-xl p-4">
          <p className="text-foreground/40 text-xs uppercase tracking-wider mb-1">Pending</p>
          <p className="text-2xl font-bold font-space text-foreground">${rewards.pending.toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-foreground/40 text-xs uppercase tracking-wider mb-1">Claimed</p>
          <p className="text-2xl font-bold font-space text-foreground">${rewards.claimed.toLocaleString()}</p>
        </div>
      </div>

      {rewards.lastClaim && (
        <p className="text-foreground/40 text-sm mb-6">
          Last claim: {new Date(rewards.lastClaim).toLocaleString()}
        </p>
      )}

      <Button
        onClick={handleClaim}
        disabled={claiming}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6"
      >
        {claiming ? 'Claiming…' : 'Claim Now'}
      </Button>
    </GlassCard>
  );
}
