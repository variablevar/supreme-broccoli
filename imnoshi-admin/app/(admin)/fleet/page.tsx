import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { compactNumber, dateTime, getAdminOverview, money } from '@/lib/adminData';
import { isFullAdmin } from '@/lib/adminAuth';
import { FleetSnapshotForm } from '@/components/dashboard/FleetSnapshotForm';

export const dynamic = 'force-dynamic';

export default async function FleetPage() {
  const [{ fleetStats }, canWrite] = await Promise.all([getAdminOverview(), isFullAdmin()]);
  const latest = fleetStats[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-space text-3xl font-semibold">Fleet Stats</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GPU fleet snapshots powering the marketing ticker.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total GPUs</CardTitle>
            <Activity size={18} className="text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-space text-2xl font-semibold">{compactNumber(latest?.total_gpus)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Miners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-space text-2xl font-semibold">{compactNumber(latest?.active_miners)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hashrate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-space text-2xl font-semibold">{compactNumber(latest?.total_hashrate)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Daily Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-space text-2xl font-semibold">{money(latest?.daily_rewards)}</div>
          </CardContent>
        </Card>
      </div>

      {canWrite ? <FleetSnapshotForm /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-space">Recent Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Updated</TableHead>
                <TableHead>Total GPUs</TableHead>
                <TableHead>Active Miners</TableHead>
                <TableHead>Hashrate</TableHead>
                <TableHead className="text-right">Daily Rewards</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fleetStats.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell>{dateTime(snapshot.updated_at)}</TableCell>
                  <TableCell className="font-mono">{compactNumber(snapshot.total_gpus)}</TableCell>
                  <TableCell className="font-mono">{compactNumber(snapshot.active_miners)}</TableCell>
                  <TableCell className="font-mono">{compactNumber(snapshot.total_hashrate)}</TableCell>
                  <TableCell className="text-right font-mono">{money(snapshot.daily_rewards)}</TableCell>
                </TableRow>
              ))}
              {fleetStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No fleet snapshots yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
