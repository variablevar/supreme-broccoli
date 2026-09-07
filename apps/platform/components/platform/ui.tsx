import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card/70 p-5 md:p-6 shadow-sm",
        className,
      )}
    >
      <div className="mb-5">
        <h2 className="font-space text-lg font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
export const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";
export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
export function Status({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium capitalize">
      {children}
    </span>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      {message}
    </p>
  ) : null;
}
