"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    if (!email.trim().toLowerCase().endsWith("@imnoshi.com")) {
      toast.error("Registration requires an @imnoshi.com email address");
      return;
    }
    if (password.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res
        .json()
        .catch(() => ({}) as Record<string, unknown>);
      if (!res.ok) {
        toast.error((data?.error as string) ?? "Registration failed");
        return;
      }
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  if (submitted)
    return (
      <div role="status" className="space-y-4 text-center">
        <h2 className="font-space text-xl font-semibold">
          Application received
        </h2>
        <p className="text-sm text-muted-foreground">
          We will review your details and get back to you. You cannot sign in
          until an operator approves your application.
        </p>
        <Link
          href="/login"
          className="inline-block text-primary hover:underline"
        >
          Return to login
        </Link>
      </div>
    );
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@imnoshi.com"
          title="Use your @imnoshi.com email address"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={72}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={busy}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Submitting application…" : "Apply for access"}
      </Button>
      <p className="text-center text-sm text-muted-foreground pt-2">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
