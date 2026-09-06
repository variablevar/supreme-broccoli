import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dateTime, getAdminOverview, money } from '@/lib/adminData';
import { isFullAdmin } from '@/lib/adminAuth';
import { WithdrawalActions } from '@/components/dashboard/WithdrawalActions';
import { WithdrawalWalletPay } from '@/components/dashboard/WithdrawalWalletPay';
import { CopyButton } from '@/components/dashboard/CopyButton';

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
          For crypto withdrawals you can pay directly from a connected Web3 wallet
          (MetaMask / Rabby) and we&apos;ll record the on-chain hash for the audit log.
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
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canWrite ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((withdrawal) => {
                const destAddr =
                  withdrawal.destination_address ??
                  withdrawal.wallet_address ??
                  null;
                const destNetwork = withdrawal.destination_network;
                const destLabel =
                  withdrawal.destination_label ??
                  (destNetwork ? `${withdrawal.method} (${destNetwork})` : withdrawal.method);
                return (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <div className="font-medium">{withdrawal.users?.email ?? 'Unknown user'}</div>
                      <div className="text-xs text-muted-foreground">
                        UID {withdrawal.users?.uid ?? withdrawal.id}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{destLabel}</div>
                      {destAddr ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <code className="text-[11px] text-muted-foreground truncate max-w-[180px]" title={destAddr}>
                            {destAddr}
                          </code>
                          <CopyButton text={destAddr} />
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground italic mt-0.5">
                          No on-chain address on file -- customer must add a payout destination first
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={withdrawal.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {withdrawal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{dateTime(withdrawal.created_at)}</TableCell>
                    <TableCell className="text-right font-mono">{money(withdrawal.amount)}</TableCell>
                    {canWrite ? (
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <WithdrawalActions
                            withdrawalId={withdrawal.id}
                            status={withdrawal.status}
                            amount={Number(withdrawal.amount)}
                          />
                          <WithdrawalWalletPay
                            withdrawalId={withdrawal.id}
                            amount={Number(withdrawal.amount)}
                            destinationAddress={destAddr}
                            destinationLabel={destLabel}
                            destinationNetwork={destNetwork}
                            method={withdrawal.method}
                            status={withdrawal.status}
                          />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
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
