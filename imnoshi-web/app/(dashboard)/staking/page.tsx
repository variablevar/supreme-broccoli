import { StakeForm } from '@/components/dashboard/staking/StakeForm';
import { StakingChart } from '@/components/dashboard/staking/StakingChart';

export default function StakingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">Staking</h1>
        <p className="text-foreground/50">Lock funds to increase reward multipliers and APY.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <StakeForm />
        <StakingChart />
      </div>
    </div>
  );
}
