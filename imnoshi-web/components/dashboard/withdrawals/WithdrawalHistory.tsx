'use client';
import { GlassCard } from '@/components/shared/GlassCard';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAccountData } from '@/hooks/useAccountData';

export function WithdrawalHistory() {
  const { withdrawals, loading } = useAccountData();

  return (
    <GlassCard className="h-full">
      <h3 className="font-space font-semibold text-foreground text-xl mb-6">Withdrawal History</h3>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : withdrawals.length === 0 ? (
        <p className="text-muted-foreground text-sm">No withdrawals yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground/50">Date</TableHead>
              <TableHead className="text-foreground/50">Method</TableHead>
              <TableHead className="text-foreground/50">Amount</TableHead>
              <TableHead className="text-foreground/50">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-foreground/70">
                  {new Date(row.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="capitalize text-foreground/70">{row.method}</TableCell>
                <TableCell className="text-foreground font-mono">
                  ${Number(row.amount).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.status === 'completed'
                        ? 'default'
                        : row.status === 'processing'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {row.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </GlassCard>
  );
}
