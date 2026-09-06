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
import { useEffect, useState } from 'react';
import { useAccountData } from '@/hooks/useAccountData';

interface VerifyRow {
  id: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed' | 'mismatch';
  details: string;
  confirmations?: number;
}

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
  // On-chain receipt verification -- polls every 60 s so the user
  // sees the badge flip from pending to confirmed around ~3 min
  // after the admin records the payout (12 confirmations).
  const [verifyResults, setVerifyResults] = useState<VerifyRow[]>([]);
  const [verifyHead, setVerifyHead] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchVerify = async () => {
      try {
        const res = await fetch("/api/payouts/verify", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { headBlock: number; results: VerifyRow[] };
        if (!cancelled) {
          setVerifyResults(j.results ?? []);
          setVerifyHead(j.headBlock ?? null);
        }
      } catch {}
    };
    fetchVerify();
    const id = setInterval(fetchVerify, 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
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
      <GlassCard hover={false}>
        <h3 className="font-space font-semibold text-foreground text-xl mb-3">On-chain payout status</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Each payout the admin records is checked on Ethereum mainnet. 12 confirmations (~3 min) are required to mark a transfer as confirmed.
          {verifyHead ? <span className="ml-2 text-xs font-mono">head #{verifyHead.toLocaleString()}</span> : null}
        </p>
        {verifyResults.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payouts to verify yet.</p>
        ) : (
          <ul className="space-y-2">
            {verifyResults.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-muted-foreground truncate">{r.txHash}</p>
                  <p className="text-sm mt-1">{r.details}</p>
                </div>
                <span className={
                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap " +
                  (r.status === "confirmed"
                    ? "bg-success/15 text-success"
                    : r.status === "failed"
                      ? "bg-destructive/15 text-destructive"
                      : r.status === "mismatch"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-muted text-muted-foreground")
                }>
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
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
