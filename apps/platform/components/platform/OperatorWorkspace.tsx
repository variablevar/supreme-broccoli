"use client";
import { useState, type FormEvent, type ReactNode } from "react";
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
import {
  EMPTY_PUBLICATION,
  PUBLICATION_PRESETS,
} from "@/modules/devices/publication-presets";
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
      registrations: "User applications",
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
              <BulkPublish devices={data.devices} onChange={refresh} />
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
          {section === "registrations" && (
            <Panel
              title="Registration applications"
              description="Approving an application creates its customer login. Rejected applicants may apply again."
            >
              {data.applications.length ? (
                <div className="space-y-3">
                  {data.applications.map((application) => (
                    <ApplicationRow
                      key={application.id}
                      application={application}
                      onChange={refresh}
                    />
                  ))}
                </div>
              ) : (
                <Empty>No registration applications yet.</Empty>
              )}
            </Panel>
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
function ApplicationRow({
  application,
  onChange,
}: {
  application: OperatorOverview["applications"][number];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [error, setError] = useState("");
  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    setError("");
    try {
      await request(`/api/admin/registrations/${application.id}/decide`, {
        decision,
        reason,
      });
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p data-no-translate className="font-medium">
            {application.email}
          </p>
          <p className="text-xs text-muted-foreground">
            Applied {new Date(application.created_at).toLocaleString()}
          </p>
        </div>
        <Status>{application.status}</Status>
      </div>
      {application.status === "pending" && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            disabled={busy}
            onClick={() => decide("approved")}
            className={buttonClass}
          >
            Approve user
          </button>
          <input
            aria-label="Rejection reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection"
            className={inputClass}
          />
          <button
            disabled={busy || reason.trim().length < 3}
            onClick={() => decide("rejected")}
            className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
      <ErrorMessage message={error} />
    </article>
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
      ...EMPTY_PUBLICATION,
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
              <PresetPicker onSelect={setContent} />
              <PublicationSection title="Page 1 · Overview">
                <PublicationField
                  label="Node display title"
                  field="title"
                  max={32}
                  required
                  content={content}
                  setContent={setContent}
                />
                <p className="text-xs text-muted-foreground">
                  Node ID and uptime come directly from the device.
                </p>
              </PublicationSection>
              <PublicationSection title="Page 2 · Network">
                <p className="text-xs text-muted-foreground">
                  Wi-Fi connection, signal strength, server sync and uptime are
                  reported by the device and cannot be edited.
                </p>
              </PublicationSection>
              <PublicationSection title="Page 3 · Activity">
                <PublicationField
                  label="Current activity"
                  field="activity"
                  max={24}
                  content={content}
                  setContent={setContent}
                />
                <PublicationField
                  label="Rate and unit"
                  field="rate"
                  max={24}
                  content={content}
                  setContent={setContent}
                />
              </PublicationSection>
              <PublicationSection title="Page 4 · Revenue">
                <PublicationField
                  label="Published total USDT"
                  field="totalUsdt"
                  max={16}
                  required
                  content={content}
                  setContent={setContent}
                />
                <PublicationField
                  label="Published daily USDT"
                  field="dailyUsdt"
                  max={16}
                  required
                  content={content}
                  setContent={setContent}
                />
                <PublicationField
                  label="Revenue message"
                  field="message"
                  max={120}
                  content={content}
                  setContent={setContent}
                />
              </PublicationSection>
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
function PresetPicker({
  onSelect,
}: {
  onSelect: (content: Publication) => void;
}) {
  return (
    <Field label="Start from a preset">
      <select
        defaultValue=""
        onChange={(event) => {
          const preset = PUBLICATION_PRESETS.find(
            (item) => item.id === event.target.value,
          );
          if (preset) onSelect({ ...preset.content });
        }}
        className={inputClass}
      >
        <option value="" disabled>
          Choose one of {PUBLICATION_PRESETS.length} presets
        </option>
        {PUBLICATION_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name} — {preset.description}
          </option>
        ))}
      </select>
    </Field>
  );
}
function BulkPublish({
  devices,
  onChange,
}: {
  devices: Device[];
  onChange: () => void;
}) {
  const available = devices.filter((device) => !device.revoked_at);
  const [target, setTarget] = useState<
    "all" | "selected" | "online" | "offline"
  >("selected");
  const [selected, setSelected] = useState<string[]>([]);
  const [content, setContent] = useState<Publication>({ ...EMPTY_PUBLICATION });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const targetCount =
    target === "all"
      ? available.length
      : target === "online"
        ? available.filter((device) => device.online).length
        : target === "offline"
          ? available.filter((device) => !device.online).length
          : selected.filter((id) =>
              available.some((device) => device.id === id),
            ).length;
  async function publish(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult("");
    try {
      const response = await request<{ publishedCount: number }>(
        "/api/admin/devices/publications",
        { target, deviceIds: selected, content },
        "PUT",
      );
      setResult(
        `Published to ${response.publishedCount} device${response.publishedCount === 1 ? "" : "s"}.`,
      );
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk publication failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Publish to device group"
      description="Choose a preset, adjust its display values, and send it to all devices or a live-status group in one operation."
    >
      <form onSubmit={publish} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <PresetPicker onSelect={setContent} />
          <Field label="Target devices">
            <select
              value={target}
              onChange={(event) =>
                setTarget(event.target.value as typeof target)
              }
              className={inputClass}
            >
              <option value="selected">Selected devices</option>
              <option value="all">All active devices</option>
              <option value="online">Online devices</option>
              <option value="offline">Offline devices</option>
            </select>
          </Field>
        </div>
        {target === "selected" && (
          <fieldset className="rounded-xl border border-border p-4">
            <legend className="px-2 text-sm font-medium">Select devices</legend>
            {available.length ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {available.map((device) => (
                  <label
                    key={device.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(device.id)}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...selected, device.id]
                            : selected.filter((id) => id !== device.id),
                        )
                      }
                    />
                    <span className="min-w-0">
                      <span
                        data-no-translate
                        className="block truncate font-medium"
                      >
                        {device.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {device.online ? "Online" : "Offline"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <Empty>No active devices available.</Empty>
            )}
          </fieldset>
        )}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <PublicationField
            label="Title"
            field="title"
            max={32}
            required
            content={content}
            setContent={setContent}
          />
          <PublicationField
            label="Activity"
            field="activity"
            max={24}
            content={content}
            setContent={setContent}
          />
          <PublicationField
            label="Rate and unit"
            field="rate"
            max={24}
            content={content}
            setContent={setContent}
          />
          <PublicationField
            label="Daily USDT"
            field="dailyUsdt"
            max={16}
            required
            content={content}
            setContent={setContent}
          />
          <PublicationField
            label="Total USDT"
            field="totalUsdt"
            max={16}
            required
            content={content}
            setContent={setContent}
          />
          <PublicationField
            label="Message"
            field="message"
            max={120}
            content={content}
            setContent={setContent}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Offline devices receive the publication on their next successful sync.
          Publishing display values does not change customer balances.
        </p>
        <button disabled={busy || targetCount === 0} className={buttonClass}>
          {busy
            ? "Publishing…"
            : `Publish to ${targetCount} device${targetCount === 1 ? "" : "s"}`}
        </button>
        {result && (
          <p role="status" className="text-sm text-primary">
            {result}
          </p>
        )}
        <ErrorMessage message={error} />
      </form>
    </Panel>
  );
}
function PublicationSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-4">
      <legend className="px-2 text-sm font-semibold text-primary">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
function PublicationField({
  label,
  field,
  max,
  required = false,
  content,
  setContent,
}: {
  label: string;
  field: keyof Publication;
  max: number;
  required?: boolean;
  content: Publication;
  setContent: (content: Publication) => void;
}) {
  return (
    <Field label={label}>
      <input
        required={required}
        maxLength={max}
        value={content[field]}
        onChange={(e) => setContent({ ...content, [field]: e.target.value })}
        className={inputClass}
      />
    </Field>
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
