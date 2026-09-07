"use client";
import { useState } from "react";
import type { Withdrawal } from "@/modules/accounts/types";
import { money, request } from "./data";
import { Empty, Status, ErrorMessage, buttonClass, inputClass } from "./ui";
export function Withdrawals({
  rows,
  operator = false,
  onChange,
}: {
  rows: Withdrawal[];
  operator?: boolean;
  onChange: () => void;
}) {
  if (!rows.length) return <Empty>No withdrawal requests yet.</Empty>;
  return (
    <div className="space-y-4">
      {rows.map((w) => (
        <WithdrawalRow
          key={w.id}
          w={w}
          operator={operator}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
function WithdrawalRow({
  w,
  operator,
  onChange,
}: {
  w: Withdrawal;
  operator: boolean;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reason, setReason] = useState(""),
    [hash, setHash] = useState("");
  async function act(decision: "approved" | "rejected" | "paid") {
    setBusy(true);
    setError("");
    try {
      await request(
        decision === "paid"
          ? "/api/admin/withdrawals/complete"
          : "/api/admin/withdrawals/decide",
        decision === "paid"
          ? { withdrawalId: w.id, txHash: hash }
          : { withdrawalId: w.id, decision, reason },
      );
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p data-no-translate className="font-mono font-medium">
            {money(w.amount)} USDT
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span data-no-translate>
              {w.email || new Date(w.created_at).toLocaleString()}
            </span>{" "}
            · ERC20
          </p>
        </div>
        <Status>{w.status}</Status>
      </div>
      <p
        data-no-translate
        className="my-3 break-all font-mono text-xs text-muted-foreground"
      >
        {w.destination}
      </p>
      {w.reason && (
        <p className="mb-3 text-sm">
          Reason: <span data-no-translate>{w.reason}</span>
        </p>
      )}
      {w.tx_hash && (
        <a
          data-no-translate
          className="block break-all text-xs text-primary underline"
          href={"https://etherscan.io/tx/" + w.tx_hash}
          target="_blank"
          rel="noreferrer"
        >
          {w.tx_hash}
        </a>
      )}
      {w.status === "paid" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Payment recorded by operator.
        </p>
      )}
      {operator && ["requested", "approved"].includes(w.status) && (
        <div className="space-y-3 border-t border-border pt-4">
          {w.status === "requested" && (
            <button
              disabled={busy}
              onClick={() => act("approved")}
              className={buttonClass}
            >
              Approve request
            </button>
          )}
          {w.status === "approved" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                aria-label="External transaction hash"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                placeholder="External Ethereum transaction hash"
                className={inputClass}
              />
              <button
                disabled={busy || !hash}
                onClick={() => act("paid")}
                className={buttonClass + " shrink-0"}
              >
                Record payment
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Rejection reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for rejection"
              className={inputClass}
            />
            <button
              disabled={busy || reason.trim().length < 3}
              onClick={() => act("rejected")}
              className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
            >
              Reject
            </button>
          </div>
          <ErrorMessage message={error} />
        </div>
      )}
    </article>
  );
}
