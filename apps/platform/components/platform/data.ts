"use client";
import { useCallback, useEffect, useState } from "react";
export async function request<T>(
  url: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const res = await fetch(
    url,
    body === undefined
      ? { cache: "no-store" }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await res
    .json()
    .catch(() => ({ error: "Unexpected server response" }));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}
export function useRemote<T>(url: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await request<T>(url);
        if (active) {
          setData(result);
          setError("");
        }
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Could not load data");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const interval = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [url, revision]);
  return { data, error, loading, refresh };
}
// Preserve all six decimal places without floating-point conversion.
export function money(value: string) {
  const [integer, fraction = ""] = value.split(".");
  return (
    integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    "." +
    fraction.padEnd(6, "0")
  );
}
