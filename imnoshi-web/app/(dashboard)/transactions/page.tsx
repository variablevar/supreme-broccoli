'use client';
import { GlassCard } from '@/components/shared/GlassCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAccountData } from '@/hooks/useAccountData';

interface TxRow {
  id: string;
  type: string;
  amount: string;
  positive: boolean;
  date: string;
  timestamp: number;
  status: string;
}

export default function TransactionsPage() {
  const { rewards, withdrawals, loading } = useAccountData();

  const transactions: TxRow[] = [
    ...rewards.map((r) => ({
      id: r.id,
      type: `Earning (${r.source.replace('_', ' ')})`,
      amount: `+${Number(r.amount).toLocaleString()} USDT`,
      positive: true,
      date: new Date(r.created_at).toLocaleString(),
      timestamp: new Date(r.created_at).getTime(),
      status: r.status,
    })),
    ...withdrawals.map((w) => ({
      id: w.id,
      type: 'Withdrawal',
      amount: `-${Number(w.amount).toLocaleString()} USDT`,
      positive: false,
      date: new Date(w.created_at).toLocaleString(),
      timestamp: new Date(w.created_at).getTime(),
      status: w.status,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">Transactions</h1>
        <p className="text-muted-foreground">Complete USDT earning and withdrawal history with time and date.</p>
      </div>

      <GlassCard>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transactions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground/50">ID</TableHead>
                <TableHead className="text-foreground/50">Type</TableHead>
                <TableHead className="text-foreground/50">Date</TableHead>
                <TableHead className="text-foreground/50">Amount</TableHead>
                <TableHead className="text-foreground/50">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-foreground/70">{tx.id.slice(0, 8)}…</TableCell>
                  <TableCell className="text-foreground/70 capitalize">{tx.type}</TableCell>
                  <TableCell className="text-foreground/70">{tx.date}</TableCell>
                  <TableCell
                    className={`font-mono ${tx.positive ? 'text-success' : 'text-destructive'}`}
                  >
                    {tx.amount}
                  </TableCell>
                  <TableCell className="text-foreground/70 text-sm capitalize">{tx.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>
    </div>
  );
}
