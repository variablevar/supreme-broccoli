import { WithdrawalForm } from '@/components/dashboard/withdrawals/WithdrawalForm';
import { WithdrawalHistory } from '@/components/dashboard/withdrawals/WithdrawalHistory';
import { PayoutDestinationManager } from '@/components/dashboard/withdrawals/PayoutDestinationManager';

export default function WithdrawalsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">Withdrawals</h1>
        <p className="text-foreground/50">Request USDT payouts every 7 days and manage Revolut or crypto destinations.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <WithdrawalForm />
        <WithdrawalHistory />
      </div>
      <PayoutDestinationManager />
    </div>
  );
}
