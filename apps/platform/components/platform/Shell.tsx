"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Cpu,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  UserCheck,
  ScrollText,
  Landmark,
  ShieldAlert,
  MessagesSquare,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { cn } from "@/lib/utils";
import { request } from "./data";
import { ErrorMessage } from "./ui";
import { useI18n } from "@/hooks/useI18n";
const customer = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/devices", "Devices", Cpu],
  ["/withdrawals", "Withdrawals", ArrowUpRight],
  ["/transactions", "Transactions", Activity],
  ["/settings", "Settings", Settings],
] as const;
const admin = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/devices", "Devices", Cpu],
  ["/admin/users", "Users", Users],
  ["/admin/registrations", "User applications", UserCheck],
  ["/admin/inquiries", "Enquiries", MessagesSquare],
  ["/admin/withdrawals", "Withdrawals", ArrowUpRight],
  ["/admin/balance", "Balance", Landmark],
  ["/admin/audit", "Audit Log", ScrollText],
  ["/admin/security", "Login security", ShieldAlert],
  ["/admin/settings", "Settings", Settings],
] as const;
export function Shell({
  children,
  email,
  operator = false,
}: {
  children: ReactNode;
  email: string;
  operator?: boolean;
}) {
  const path = usePathname(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { t } = useI18n();
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await request(
        operator ? "/api/admin/auth/logout" : "/api/auth/logout",
        {},
      );
      router.replace(operator ? "/admin/login" : "/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-out failed");
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-5 py-4">
          <Link href={operator ? "/admin" : "/dashboard"}>
            <BrandLogo />
          </Link>
          <span className="hidden sm:inline text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {operator ? "Operator console" : "Your connected workspace"}
          </span>
          <div className="flex items-center gap-3">
            <span
              data-no-translate
              className="hidden md:block text-sm text-muted-foreground"
            >
              {email}
            </span>
            <button
              onClick={logout}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"
            >
              <LogOut size={14} />
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-screen-2xl flex-col md:flex-row">
        <aside className="border-b border-border p-3 md:sticky md:top-20 md:h-[calc(100vh-5rem)] md:w-56 md:shrink-0 md:border-b-0 md:border-r md:p-5">
          <nav
            aria-label={operator ? "Admin navigation" : "Dashboard navigation"}
            className="flex gap-1 overflow-x-auto md:flex-col"
          >
            {(operator ? admin : customer).map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-sm",
                  path === href
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <Icon size={17} />
                {label === "Overview"
                  ? t("overview")
                  : label === "Devices"
                    ? t("devices")
                    : label === "Withdrawals"
                      ? t("withdrawals")
                      : label === "Transactions"
                        ? t("transactions")
                        : label === "Settings"
                          ? t("settings")
                          : label}
              </Link>
            ))}
          </nav>
          <p className="hidden md:block mt-10 text-xs leading-5 text-muted-foreground">
            Imo / {operator ? "Operations" : "Monitor"}
            <br />
            Connected devices. Clear records.
          </p>
        </aside>
        <main id="main" className="min-w-0 flex-1 p-5 md:p-8">
          <ErrorMessage message={error} />
          {children}
        </main>
      </div>
    </div>
  );
}
