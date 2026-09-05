import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dateTime, getAdminOverview, money } from '@/lib/adminData';
import { isFullAdmin } from '@/lib/adminAuth';
import { WithdrawalActions } from '@/components/dashboard/WithdrawalActions';

export const dynamic = 'force-dynamic';

export default async function WithdrawalsPage() {
  const { withdrawals } = await getAdminOverview();
  const canWrite = await isFullAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-space text-3xl font-semibold">Withdrawals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review pending requests, approve or reject them, and record external payouts.
          {canWrite ? '' : ' You are in view-only mode.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-space">Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canWrite ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    <div className="font-medium">{withdrawal.users?.email ?? 'Unknown user'}</div>
                    <div className="text-xs text-muted-foreground">{withdrawal.users?.uid ?? withdrawal.id}</div>
                  </TableCell>
                  <TableCell className="capitalize">{withdrawal.method}</TableCell>
                  <TableCell>
                    <Badge variant={withdrawal.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {withdrawal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{dateTime(withdrawal.created_at)}</TableCell>
                  <TableCell className="text-right font-mono">{money(withdrawal.amount)}</TableCell>
                  {canWrite ? (
                    <TableCell className="text-right">
                      <WithdrawalActions
                        withdrawalId={withdrawal.id}
                        status={withdrawal.status}
                        amount={Number(withdrawal.amount)}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {withdrawals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-muted-foreground">
                    No withdrawal requests yet.
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
