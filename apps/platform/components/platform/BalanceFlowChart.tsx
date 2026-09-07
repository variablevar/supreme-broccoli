"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LedgerEntry } from "@/modules/accounts/types";
import { Panel } from "./ui";

const toMicros = (value: string) => {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace("-", "").split(".");
  const micros = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0").slice(0, 6));
  return negative ? -micros : micros;
};
const fromMicros = (value: bigint) => `${value / 1_000_000n}.${(value % 1_000_000n).toString().padStart(6, "0")}`;

export function yearToDateRevenue(ledger: LedgerEntry[], asOf: string) {
  const year = new Date(asOf).getUTCFullYear();
  const total = ledger.reduce((sum, entry) => {
    const amount = toMicros(entry.amount_usdt);
    return new Date(entry.created_at).getUTCFullYear() === year && amount > 0n ? sum + amount : sum;
  }, 0n);
  return fromMicros(total);
}

export function BalanceFlowChart({ ledger, asOf }: { ledger: LedgerEntry[]; asOf: string }) {
  const current = new Date(asOf);
  const year = current.getUTCFullYear();
  const points = Array.from({ length: current.getUTCMonth() + 1 }, (_, month) => ({
    month: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1))),
    inflow: 0,
    outflow: 0,
  }));
  for (const entry of ledger) {
    const date = new Date(entry.created_at);
    if (date.getUTCFullYear() !== year) continue;
    const amount = Number(toMicros(entry.amount_usdt)) / 1_000_000;
    if (amount >= 0) points[date.getUTCMonth()].inflow += amount;
    else points[date.getUTCMonth()].outflow += Math.abs(amount);
  }
  return <Panel title="Balance flow" description={`${year} account credits and completed withdrawals by month.`}>
    {ledger.length ? <div className="h-72 w-full" aria-label="Monthly balance inflow and outflow chart">
      <ResponsiveContainer width="100%" height="100%"><BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={55} />
        <Tooltip formatter={(value) => [`${Number(value).toFixed(6)} USDT`]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
        <Bar dataKey="inflow" name="Balance in" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="outflow" name="Balance out" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
      </BarChart></ResponsiveContainer>
    </div> : <p className="py-10 text-center text-sm text-muted-foreground">Balance activity will appear here.</p>}
    <div className="mt-4 flex gap-5 text-xs text-muted-foreground"><span><i className="mr-2 inline-block size-2 rounded-full bg-primary" />Balance in</span><span><i className="mr-2 inline-block size-2 rounded-full bg-destructive" />Balance out</span></div>
  </Panel>;
}
