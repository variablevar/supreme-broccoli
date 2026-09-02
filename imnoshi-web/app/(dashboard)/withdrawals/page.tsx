import { WithdrawalForm } from '@/components/dashboard/withdrawals/WithdrawalForm';
import { WithdrawalHistory } from '@/components/dashboard/withdrawals/WithdrawalHistory';

export default function WithdrawalsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">Withdrawals</h1>
        <p className="text-foreground/50">Request payouts and review your withdrawal history.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <WithdrawalForm />
        <WithdrawalHistory />
      </div>
    </div>
  );
}
