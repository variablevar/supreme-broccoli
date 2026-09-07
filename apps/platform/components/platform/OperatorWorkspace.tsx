"use client";
import { useState, type FormEvent } from "react";
import type {
  Device,
  OperatorOverview,
  Publication,
} from "@/modules/accounts/types";
import { useRemote, request, money } from "./data";
import {
  Panel,
  Field,
  Empty,
  Status,
  ErrorMessage,
  inputClass,
  buttonClass,
} from "./ui";
import { DeviceCard } from "./DeviceCard";
import { Withdrawals } from "./Withdrawals";
export function OperatorWorkspace({
  section = "overview",
}: {
  section?: string;
}) {
  const { data, error, loading, refresh } = useRemote<OperatorOverview>(
    "/api/admin/overview",
  );
  const title = (
    {
      overview: "Operations overview",
      devices: "Device fleet",
      users: "Customers",
      withdrawals: "Withdrawal queue",
      balance: "Account adjustments",
      audit: "Audit trail",
    } as Record<string, string>
  )[section];
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex justify-between gap-3">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-primary">
            Imo / Operations
          </p>
          <h1 className="font-space text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage devices, published information and customer accounts.
          </p>
        </div>
        <button
          onClick={refresh}
          className="self-start rounded-lg border border-border px-3 py-2 text-sm"
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
        <p role="status" className="py-12 animate-pulse">
          Loading operations…
        </p>
      )}
      {data && (
        <>
          {section === "overview" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Customers", data.users.length],
                  [
                    "Devices online",
                    data.devices.filter((d) => d.online).length,
                  ],
                  [
                    "Awaiting review",
                    data.withdrawals.filter((w) => w.status === "requested")
                      .length,
                  ],
                ].map(([label, n]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-border bg-card/70 p-5"
                  >
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-3 font-space text-4xl">{n}</p>
                  </div>
                ))}
              </div>
              <Panel title="Requests to review">
                <Withdrawals
                  rows={data.withdrawals
                    .filter((w) => w.status === "requested")
                    .slice(0, 5)}
                  operator
                  onChange={refresh}
                />
              </Panel>
              <Panel title="Purchase inquiries">
                {data.inquiries.length ? (
                  data.inquiries.map((i) => (
                    <div
                      key={i.id}
                      className="flex flex-wrap justify-between gap-2 border-b border-border py-3"
                    >
                      <span data-no-translate>
                        {i.name} · {i.email}
                      </span>
                      <span>
                        {i.quantity} devices · {i.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <Empty>No purchase inquiries yet.</Empty>
                )}
              </Panel>
            </>
          )}
          {section === "devices" && (
            <>
              <Provision onChange={refresh} />
              {!data.devices.length && (
                <Empty>Register your first physical display.</Empty>
              )}
              <div className="grid gap-6 xl:grid-cols-2">
                {data.devices.map((d) => (
                  <div key={d.id} className="space-y-3">
                    <DeviceCard device={d} />
                    <Publish device={d} onChange={refresh} />
                  </div>
                ))}
              </div>
            </>
          )}
          {["users", "balance"].includes(section) && (
            <>
              <Panel
                title="Customer accounts"
                description="Recent 200 customers. Funds are managed through audited adjustments."
              >
                {data.users.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="py-3">Customer</th>
                          <th className="py-3">Balance (USDT)</th>
                          <th className="py-3">Available (USDT)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.users.map((u) => (
                          <tr key={u.id} className="border-b border-border">
                            <td className="py-4">
                              <p data-no-translate>{u.email}</p>
                              <p
                                data-no-translate
                                className="text-xs text-muted-foreground"
                              >
                                {u.uid}
                              </p>
                            </td>
                            <td data-no-translate className="font-mono">
                              {money(u.balance)}
                            </td>
                            <td data-no-translate className="font-mono">
                              {money(u.available)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>Customers appear after registering.</Empty>
                )}
              </Panel>
              <Adjust users={data.users} onChange={refresh} />
            </>
          )}
          {section === "withdrawals" && (
            <Panel
              title="Withdrawal requests"
              description="Approve a request, transfer USDT externally to its saved destination, then record the transaction hash."
            >
              <Withdrawals
                rows={data.withdrawals}
                operator
                onChange={refresh}
              />
            </Panel>
          )}
          {section === "audit" && (
            <Panel
              title="Recent audit events"
              description="Latest 100 operator events. Financial and publication changes are logged in the same database transaction."
            >
              {data.audit.length ? (
                <div className="divide-y divide-border">
                  {data.audit.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap justify-between gap-3 py-4"
                    >
                      <div>
                        <p data-no-translate className="text-sm font-medium">
                          {a.action}
                        </p>
                        <p
                          data-no-translate
                          className="text-xs text-muted-foreground"
                        >
                          {a.actor_email} · {a.target_id}
                        </p>
                      </div>
                      <time
                        data-no-translate
                        className="text-xs text-muted-foreground"
                      >
                        {new Date(a.created_at).toLocaleString()}
                      </time>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>No operator actions yet.</Empty>
              )}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
function Provision({ onChange }: { onChange: () => void }) {
  const [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [credentials, setCredentials] = useState<{
      uid: string;
      secret: string;
    } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await request<{ uid: string; secret: string }>(
        "/api/admin/devices",
        { name },
      );
      setCredentials(result);
      setName("");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Provisioning failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Register a device"
      description="Generate a unique credential for a physical display, then provision it over USB."
    >
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Device name"
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Device name"
          className={inputClass}
        />
        <button
          disabled={busy || !!credentials}
          className={buttonClass + " shrink-0"}
        >
          {busy ? "Registering…" : "Register device"}
        </button>
      </form>
      <ErrorMessage message={error} />
      {credentials && (
        <div className="mt-4 space-y-3 rounded-xl border border-primary/30 p-4">
          <p className="text-sm">
            Save this credential now. It is shown once. Enter it in the USB
            provisioning command described in the firmware README.
          </p>
          <p data-no-translate className="font-mono text-sm">
            {credentials.uid}
          </p>
          <code data-no-translate className="block break-all text-sm">
            {credentials.secret}
          </code>
          <button
            className="text-sm text-primary underline"
            onClick={() => setCredentials(null)}
          >
            I have saved the credential
          </button>
        </div>
      )}
    </Panel>
  );
}
function Publish({
  device,
  onChange,
}: {
  device: Device;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false),
    [content, setContent] = useState<Publication>({
      title: "",
      message: "",
      activity: "",
      rate: "",
      dailyUsdt: "0",
      totalUsdt: "0",
    }),
    [version, setVersion] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revoking, setRevoking] = useState(false);
  function edit() {
    setContent(
      device.content || {
        title: device.name.replace(/[^\x20-\x7E]/g, "").slice(0, 32) || "Imo",
        message: "",
        activity: "",
        rate: "",
        dailyUsdt: "0",
        totalUsdt: "0",
      },
    );
    setVersion(device.version || 0);
    setEditing(true);
    setError("");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request(
        `/api/admin/devices/${device.id}/state`,
        { content, expectedVersion: version },
        "PUT",
      );
      setEditing(false);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publication failed");
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    setBusy(true);
    setError("");
    try {
      await request(`/api/admin/devices/${device.id}/revoke`, {});
      setRevoking(false);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revocation failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-xs text-muted-foreground">
        Owner: <span data-no-translate>{device.user_id || "Unpaired"}</span>
      </p>
      {device.revoked_at ? (
        <Status>Credential revoked</Status>
      ) : (
        <>
          <div className="flex gap-3">
            <button disabled={busy} onClick={edit} className={buttonClass}>
              Edit publication
            </button>
            <button
              disabled={busy}
              onClick={() => setRevoking(true)}
              className="text-xs text-muted-foreground underline"
            >
              Revoke credential
            </button>
          </div>
          {revoking && (
            <div className="mt-3 rounded-lg border border-destructive/30 p-3 text-sm">
              <p>
                This stops the device from connecting. It will need a newly
                provisioned identity.
              </p>
              <button
                disabled={busy}
                className="mt-2 text-destructive underline"
                onClick={revoke}
              >
                Revoke this device
              </button>
              <button
                className="ml-4 underline"
                onClick={() => setRevoking(false)}
              >
                Cancel
              </button>
            </div>
          )}
          {editing && (
            <form onSubmit={save} className="mt-4 space-y-3">
              {(
                [
                  ["title", "Display title", 32],
                  ["message", "Message", 120],
                  ["activity", "Activity", 24],
                  ["rate", "Rate / unit", 24],
                  ["dailyUsdt", "Published daily USDT", 16],
                  ["totalUsdt", "Published total USDT", 16],
                ] as const
              ).map(([key, label, max]) => (
                <Field key={key} label={label}>
                  <input
                    required={["title", "dailyUsdt", "totalUsdt"].includes(key)}
                    maxLength={max}
                    value={content[key]}
                    onChange={(e) =>
                      setContent({ ...content, [key]: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
              ))}
              <p className="text-xs text-muted-foreground">
                Display text currently supports ASCII. Publishing does not
                change account balances.
              </p>
              <div className="flex gap-3">
                <button disabled={busy} className={buttonClass}>
                  Publish version {version + 1}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-sm underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
      <ErrorMessage message={error} />
    </div>
  );
}
function Adjust({
  users,
  onChange,
}: {
  users: OperatorOverview["users"];
  onChange: () => void;
}) {
  const [userId, setUserId] = useState(""),
    [amount, setAmount] = useState(""),
    [reason, setReason] = useState(""),
    [key, setKey] = useState(""),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess(false);
    const requestKey = key || crypto.randomUUID();
    setKey(requestKey);
    try {
      await request("/api/admin/balance/adjust", {
        userId,
        amount,
        reason,
        requestKey,
      });
      setKey("");
      setAmount("");
      setReason("");
      setSuccess(true);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adjustment failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Adjust a balance"
      description="Positive amounts credit the account; negative amounts debit available funds. A reason is required."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Customer">
          <select
            required
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setKey("");
            }}
            className={inputClass}
          >
            <option value="">Select a customer</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email} · {u.uid}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Signed amount (USDT)">
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setKey("");
              }}
              placeholder="100.000000 or -25"
              className={inputClass}
            />
          </Field>
          <Field label="Reason">
            <input
              required
              minLength={3}
              maxLength={280}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setKey("");
              }}
              placeholder="Reason for the adjustment"
              className={inputClass}
            />
          </Field>
        </div>
        <button disabled={busy || !users.length} className={buttonClass}>
          {busy ? "Recording…" : "Record adjustment"}
        </button>
        <ErrorMessage message={error} />
        {success && (
          <p role="status" className="text-sm text-primary">
            Adjustment recorded.
          </p>
        )}
      </form>
    </Panel>
  );
}
