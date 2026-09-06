import { EngineStatusGauges } from '@/components/dashboard/overview/EngineStatusGauges';
import { BalanceCard } from '@/components/dashboard/overview/BalanceCard';
import { RecentActivity } from '@/components/dashboard/overview/RecentActivity';
import { DeviceSummary } from '@/components/dashboard/overview/DeviceSummary';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">Overview</h1>
        <p className="text-foreground/50">Monitor connected devices, active engine work and USDT earnings.</p>
      </div>

      <DeviceSummary />
      <EngineStatusGauges />

      <div className="grid lg:grid-cols-2 gap-6">
        <BalanceCard />
        <RecentActivity />
      </div>
    </div>
  );
}
