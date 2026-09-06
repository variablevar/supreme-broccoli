import { Activity, ArrowDownLeft, Gift, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { compactNumber, dateTime, getAdminOverview, money } from '@/lib/adminData';

export const dynamic = 'force-dynamic';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon size={18} className="text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold font-space">{value}</div>
      </CardContent>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const data = await getAdminOverview();
  const pendingWithdrawals = data.withdrawals.filter((w) => w.status === 'pending');
  const pendingWithdrawalTotal = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
  const pendingRewards = data.rewards
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const latestFleet = data.fleetStats[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-space text-3xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform activity and recent operations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={compactNumber(data.users.length)} icon={Users} />
        <StatCard label="Pending Withdrawals" value={money(pendingWithdrawalTotal)} icon={ArrowDownLeft} />
        <StatCard label="Pending Rewards" value={money(pendingRewards)} icon={Gift} />
        <StatCard
          label="Active Miners"
          value={compactNumber(latestFleet?.active_miners)}
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-space">Recent Withdrawals</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.withdrawals.slice(0, 6).map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <div className="font-medium">{withdrawal.users?.email ?? 'Unknown user'}</div>
                      <div className="text-xs text-muted-foreground">{dateTime(withdrawal.created_at)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={withdrawal.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {withdrawal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{money(withdrawal.amount)}</TableCell>
                  </TableRow>
                ))}
                {data.withdrawals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No withdrawals yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-space">Fleet Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Total GPUs</p>
              <p className="mt-1 font-mono text-xl">{compactNumber(latestFleet?.total_gpus)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hashrate</p>
              <p className="mt-1 font-mono text-xl">{compactNumber(latestFleet?.total_hashrate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Daily Rewards</p>
              <p className="mt-1 font-mono text-xl">{money(latestFleet?.daily_rewards)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="mt-1 text-sm">{dateTime(latestFleet?.updated_at)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
