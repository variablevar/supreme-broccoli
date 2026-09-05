import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dateTime, money } from '@/lib/adminData';
import { createAdminClient } from '@/lib/supabase';
import { isFullAdmin } from '@/lib/adminAuth';
import { BalanceAdjustmentForm } from '@/components/dashboard/BalanceAdjustmentForm';

export const dynamic = 'force-dynamic';

export default async function BalancePage() {
  const supabase = createAdminClient();
  const canWrite = await isFullAdmin();

  // Each user's reconstructed balance + their email
  const { data: balances } = await supabase
    .from('customer_balance_v')
    .select('user_id, balance, total_credits, total_debits')
    .order('balance', { ascending: false })
    .limit(100);

  const { data: users } = await supabase.from('users').select('id, email, uid, vip_status');
  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-space text-3xl font-semibold">Customer Balances</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reconstructed from <code className="font-mono">balance_ledger</code>. The
          same source of truth the customer dashboard reads from.
        </p>
      </div>

      {canWrite ? <BalanceAdjustmentForm users={users ?? []} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-space">Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>UID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right">Debits</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(balances ?? []).map((b) => {
                const u = userMap.get(b.user_id as string);
                return (
                  <TableRow key={b.user_id as string}>
                    <TableCell className="font-medium">{u?.email ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{u?.uid ?? '—'}</TableCell>
                    <TableCell>{u?.vip_status ? 'VIP' : 'Standard'}</TableCell>
                    <TableCell className="text-right font-mono text-success">{money(b.total_credits)}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">{money(b.total_debits)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{money(b.balance)}</TableCell>
                  </TableRow>
                );
              })}
              {(balances ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No ledger entries yet.
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
