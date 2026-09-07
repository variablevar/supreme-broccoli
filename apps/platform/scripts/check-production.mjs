import { readFile } from "node:fs/promises";

async function environment() {
  const values = {};
  for (const name of [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ]) {
    try {
      for (const line of (
        await readFile(new URL(`../${name}`, import.meta.url), "utf8")
      ).split(/\r?\n/)) {
        if (!line || line.trimStart().startsWith("#") || !line.includes("="))
          continue;
        const separator = line.indexOf("=");
        values[line.slice(0, separator)] = line.slice(separator + 1);
      }
    } catch {}
  }
  return { ...values, ...process.env };
}

const env = await environment();
const failures = [];
function requireValue(name) {
  const value = env[name]?.trim();
  if (!value) failures.push(`${name} is required`);
  return value || "";
}
function httpsOrigin(name) {
  const value = requireValue(name);
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      failures.push(`${name} must be a clean HTTPS origin`);
  } catch {
    if (value) failures.push(`${name} must be a valid URL`);
  }
}

httpsOrigin("NEXT_PUBLIC_SUPABASE_URL");
httpsOrigin("APP_ORIGIN");
const serviceKey = requireValue("SUPABASE_SERVICE_ROLE_KEY");
if (serviceKey.startsWith("sb_publishable_") || serviceKey === "sb_secret_...")
  failures.push(
    "SUPABASE_SERVICE_ROLE_KEY must contain the secret service-role credential",
  );
const encryptionKey = requireValue("TOTP_ENCRYPTION_KEY");
if (
  !/^[a-f0-9]{64}$/i.test(encryptionKey) ||
  new Set(encryptionKey.toLowerCase()).size < 8
)
  failures.push(
    "TOTP_ENCRYPTION_KEY must be 32 random bytes encoded as hexadecimal",
  );
const admins = requireValue("ADMIN_EMAILS");
if (
  admins &&
  !admins
    .split(",")
    .every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
)
  failures.push("ADMIN_EMAILS must be a comma-separated email list");

if (failures.length) {
  console.error(
    "Production configuration failed:\n" +
      failures.map((failure) => `- ${failure}`).join("\n"),
  );
  process.exit(1);
}
console.log(
  "Production configuration checks passed. Secret values were not printed.",
);
