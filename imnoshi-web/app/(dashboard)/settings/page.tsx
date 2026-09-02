'use client';
import { useState } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, setUser } = useDashboardStore();
  const [walletAddress, setWalletAddress] = useState(user.walletAddress ?? '');

  const handleSave = () => {
    setUser({ ...user, walletAddress });
    toast.success('Settings saved');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-foreground/50">Manage your wallet and account preferences.</p>
      </div>

      <div className="max-w-2xl">
        <GlassCard>
          <h3 className="font-space font-semibold text-foreground text-xl mb-6">Wallet Address</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="wallet" className="text-foreground/70">Payout Wallet</Label>
              <Input
                id="wallet"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x... or wallet address"
                className="mt-1 bg-background border-input text-foreground"
              />
            </div>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-foreground font-semibold">
              Save Changes
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
