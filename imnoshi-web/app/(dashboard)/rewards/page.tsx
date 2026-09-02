import { RewardClaimPanel } from '@/components/dashboard/rewards/RewardClaimPanel';
import { PollCountdown } from '@/components/dashboard/rewards/PollCountdown';

export default function RewardsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">Rewards</h1>
        <p className="text-foreground/50">Claim pending rewards and track the current algorithm poll.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <RewardClaimPanel />
        <PollCountdown />
      </div>
    </div>
  );
}
