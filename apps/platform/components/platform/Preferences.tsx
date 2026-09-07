"use client";
import { useState } from "react";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";
import type { LanguageCode, ThemePreference } from "@/types";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { Panel, Field, inputClass, ErrorMessage } from "./ui";
import { request } from "./data";
export function Preferences() {
  const { language, theme, setLanguage, setTheme } = useDashboardStore();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(kind: "language" | "theme", value: string) {
    setBusy(true);
    setError("");
    try {
      await request("/api/user", { [kind]: value });
      if (kind === "language") setLanguage(value as LanguageCode);
      else setTheme(value as ThemePreference);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save preferences");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Preferences"
      description="Your language and appearance follow your account."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Language">
          <select
            disabled={busy}
            value={language}
            onChange={(e) => save("language", e.target.value)}
            className={inputClass}
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Appearance">
          <select
            disabled={busy}
            value={theme}
            onChange={(e) => save("theme", e.target.value)}
            className={inputClass}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </Field>
      </div>
      <ErrorMessage message={error} />
    </Panel>
  );
}
