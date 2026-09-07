"use client";
import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Panel, Field, inputClass, buttonClass, ErrorMessage } from "./ui";
import { request, useRemote } from "./data";
export function Security() {
  const router = useRouter();
  const { data, refresh } = useRemote<{ totpEnrolled: boolean }>(
    "/api/auth/me",
  );
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [enrollment, setEnrollment] = useState<{
      qrDataUrl: string;
      secret: string;
    } | null>(null);
  async function change(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/api/auth/password", {
        currentPassword: current,
        newPassword: password,
      });
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password update failed");
    } finally {
      setBusy(false);
    }
  }
  async function enroll() {
    setBusy(true);
    setError("");
    try {
      setEnrollment(await request("/api/auth/totp"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enrollment failed");
    } finally {
      setBusy(false);
    }
  }
  async function confirm(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/api/auth/totp", { totpCode: code });
      setEnrollment(null);
      setMessage("Two-factor authentication enabled. Sign in again.");
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Account security"
      description="Changing your password or second factor signs out existing sessions."
    >
      <ErrorMessage message={error} />
      {message && <p role="status">{message}</p>}
      <form onSubmit={change} className="grid gap-4 md:grid-cols-2">
        <Field label="Current password">
          <input
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="New password">
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        <button disabled={busy} className={buttonClass}>
          Change password
        </button>
      </form>
      <div className="mt-6 border-t border-border pt-5">
        <h3 className="font-semibold">Two-factor authentication</h3>
        <p className="my-3 text-sm text-muted-foreground">
          {data?.totpEnrolled
            ? "Enabled for your account."
            : "Add an authenticator app to protect your account."}
        </p>
        {data && !data.totpEnrolled && !enrollment && (
          <button onClick={enroll} disabled={busy} className={buttonClass}>
            Set up authenticator
          </button>
        )}
        {enrollment && (
          <form onSubmit={confirm} className="max-w-sm space-y-3">
            <Image
              src={enrollment.qrDataUrl}
              width={200}
              height={200}
              unoptimized
              alt="Authenticator enrollment QR code"
            />
            <code data-no-translate className="block break-all text-xs">
              {enrollment.secret}
            </code>
            <Field label="Six-digit authenticator code">
              <input
                required
                pattern="[0-9]{6}"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={inputClass}
              />
            </Field>
            <button disabled={busy} className={buttonClass}>
              Verify and enable
            </button>
          </form>
        )}
      </div>
    </Panel>
  );
}
