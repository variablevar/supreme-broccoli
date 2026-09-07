"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { Account } from "@/modules/accounts/types";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useRemote, request, money } from "./data";
import {
  Panel,
  Field,
  Empty,
  ErrorMessage,
  inputClass,
  buttonClass,
} from "./ui";
import { DeviceCard } from "./DeviceCard";
import { Withdrawals } from "./Withdrawals";
import { Preferences } from "./Preferences";
import { Security } from "./Security";
import { BalanceFlowChart, yearToDateRevenue } from "./BalanceFlowChart";
const titles: Record<string, [string, string]> = {
  overview: ["Your workspace", "A clear view of your devices and account."],
  devices: [
    "Your devices",
    "Pair a display and follow the latest operator publication.",
  ],
  withdrawals: [
    "Withdrawals",
    "Request a payment to your saved public address.",
  ],
  transactions: [
    "Account activity",
    "A record of every credit and completed withdrawal.",
  ],
  settings: ["Settings", "Make this workspace yours."],
};
export function CustomerWorkspace({
  section = "overview",
}: {
  section?: string;
}) {
  const { data, error, loading, refresh } = useRemote<Account>("/api/account");
  const setLanguage = useDashboardStore((s) => s.setLanguage),
    setTheme = useDashboardStore((s) => s.setTheme);
  const profileLanguage = data?.profile.language;
  const profileTheme = data?.profile.theme;
  useEffect(() => {
    if (profileLanguage && profileTheme) {
      setLanguage(profileLanguage);
      setTheme(profileTheme);
    }
  }, [profileLanguage, profileTheme, setLanguage, setTheme]);
  const [title, description] = titles[section] || titles.overview;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-primary">
            Imo / Monitor
          </p>
          <h1 className="font-space text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          onClick={refresh}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          Refresh
        </button>
      </div>
      <ErrorMessage
        message={
          error
            ? error + (data ? " Showing the last successful update." : "")
            : ""
        }
      />
      {loading && !data && (
        <p role="status" className="animate-pulse py-12 text-muted-foreground">
          Loading your workspace…
        </p>
      )}
      {data && (
        <>
          {["overview", "withdrawals"].includes(section) && (
            <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Available to withdraw", data.available],
                ["Reserved", data.reserved],
                ["Account balance", data.balance],
                ["Year to date revenue", yearToDateRevenue(data.ledger, data.asOf)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border bg-card/70 p-5"
                >
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p
                    data-no-translate
                    className="mt-4 font-mono text-xl md:text-2xl font-semibold"
                  >
                    {money(value)}
                  </p>
                  <p className="mt-1 text-xs text-primary">USDT</p>
                </div>
              ))}
            </div>
            <BalanceFlowChart ledger={data.ledger} asOf={data.asOf} />
            </>
          )}
          {["overview", "devices"].includes(section) && (
            <>
              <div className="grid gap-5 xl:grid-cols-2">
                {data.devices.map((d) => (
                  <DeviceCard key={d.id} device={d} />
                ))}
              </div>
              {!data.devices.length && (
                <Empty>
                  No devices paired yet. Enter the code shown on your device to
                  get started.
                </Empty>
              )}
              <PairDevice onChange={refresh} />
            </>
          )}
          {section === "withdrawals" && (
            <>
              <div className="grid gap-5 xl:grid-cols-2">
                <WithdrawalAddress account={data} onChange={refresh} />
                <RequestWithdrawal account={data} onChange={refresh} />
              </div>
              <Panel
                title="Withdrawal history"
                description="Recent 100 requests. Payment hashes are recorded by your operator."
              >
                <Withdrawals rows={data.withdrawals} onChange={refresh} />
              </Panel>
            </>
          )}
          {["overview", "transactions"].includes(section) && (
            <Panel
              title="Account activity"
              description="Credits and completed payments, recorded in your account ledger."
            >
              {data.ledger.length ? (
                <div className="divide-y divide-border">
                  {data.ledger
                    .slice(0, section === "overview" ? 5 : 100)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-4"
                      >
                        <div>
                          <p data-no-translate className="text-sm">
                            {entry.note}
                          </p>
                          <p
                            data-no-translate
                            className="mt-1 text-xs text-muted-foreground"
                          >
                            {new Date(entry.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p data-no-translate className="font-mono text-sm">
                          {money(entry.amount_usdt)} USDT
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <Empty>No account movements yet.</Empty>
              )}
            </Panel>
          )}
          {section === "settings" && (
            <>
              <Preferences />
              <Security />
            </>
          )}
        </>
      )}
    </div>
  );
}
function PairDevice({ onChange }: { onChange: () => void }) {
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await request("/api/devices/pair", { code });
      setCode("");
      setSuccess(
        "Device paired. Its next sync will receive your published state.",
      );
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pairing failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Pair a device"
      description="Enter the six-character code on your physical display. Codes expire after 15 minutes."
    >
      <form onSubmit={submit} className="max-w-lg space-y-3">
        <Field label="Pairing code">
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            minLength={6}
            autoComplete="off"
            spellCheck={false}
            placeholder="ABC234"
            className={inputClass + " font-mono tracking-[0.3em]"}
          />
        </Field>
        <button disabled={busy || code.length !== 6} className={buttonClass}>
          {busy ? "Pairing…" : "Pair device"}
        </button>
        <ErrorMessage message={error} />
        {success && (
          <p role="status" className="text-sm text-primary">
            {success}
          </p>
        )}
      </form>
    </Panel>
  );
}
function WithdrawalAddress({
  account,
  onChange,
}: {
  account: Account;
  onChange: () => void;
}) {
  const [address, setAddress] = useState(account.address?.address || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await request(
        "/api/withdrawal-address",
        { network: "ERC20", address },
        "PUT",
      );
      setSaved(true);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Withdrawal address"
      description="One public address for USDT on Ethereum (ERC20). Existing requests keep their original destination."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Public Ethereum address">
          <input
            required
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setSaved(false);
            }}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            className={inputClass + " font-mono"}
          />
        </Field>
        <button disabled={busy} className={buttonClass}>
          {busy ? "Saving…" : "Save address"}
        </button>
        <ErrorMessage message={error} />
        {saved && (
          <p role="status" className="text-sm text-primary">
            Withdrawal address saved.
          </p>
        )}
      </form>
    </Panel>
  );
}
function RequestWithdrawal({
  account,
  onChange,
}: {
  account: Account;
  onChange: () => void;
}) {
  const [amount, setAmount] = useState(""),
    [key, setKey] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess(false);
    const requestKey = key || crypto.randomUUID();
    setKey(requestKey);
    try {
      await request("/api/withdrawals", { amount, requestKey });
      setAmount("");
      setKey("");
      setSuccess(true);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Request a withdrawal"
      description="Requested funds are reserved until your operator pays or rejects the request."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Amount (USDT)">
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setKey("");
              setSuccess(false);
            }}
            placeholder="100.000000"
            className={inputClass}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          {account.address
            ? "Destination: " + account.address.address
            : "Save a withdrawal address first."}
        </p>
        <button disabled={busy || !account.address} className={buttonClass}>
          {busy ? "Requesting…" : "Request withdrawal"}
        </button>
        <ErrorMessage message={error} />
        {success && (
          <p role="status" className="text-sm text-primary">
            Withdrawal requested.
          </p>
        )}
      </form>
    </Panel>
  );
}
