# IMNOSHI — Progress Report

## Phase 1 (complete) — see top of file

The original /customer/admin pairing, role model, withdrawal flow, telemetry
ingest, captive portal, and audit log all shipped and verified (tsc clean for
admin; pre-existing framer-motion / @noble typings only on the web app). See
git history / README.md for the migration list, seed.sql, and the
seed-clerk.mjs script.

## Phase 2 (in progress) — server-driven firmware

### What changed in the firmware (imnoshi-module/)

You updated `src/main.cpp` to a ST7789 (170×320, portrait) build with a custom
Slabo16 bitmap font (`include/Slabo16.h`, plus a duplicate `Ubuntu16.h` kept
in place), WiFiManager-based provisioning, and a 4-page rotating display
(Overview / Network & Power / Activity / Wallet & Revenue).

That rewrite wiped my Phase-1 NVS / telemetry / pairing code. Everything from
this phase adds on top of your existing pages, preserves the rendering, and
only changes:

* the data source (`loadMockMetrics()` -> `applyServerState()` driven by
  `GET /api/devices/state` polled every 15 s with `Authorization: Bearer
  <claim_token>`),
* a 5th page shown only when NVS `paired == false` after WiFiManager
  succeeds ("PAIRING" — shows the 6-character code),
* NVS keys: `w_ssid`, `w_pass`, `token`, `devid`, `paired`.

### New endpoints

* `GET  /api/devices/state`  — bearer-token. Returns the full `DeviceMetrics`
  shape (uid, name, online, status, network, power, mining, wallet) joined
  from `monitor_devices` + `users` + `wallets`.
* `POST /api/devices/config` — bearer-token. Device reports its own runtime
  config (brightness, current page index). Logged to a new
  `device_runtime_state` table for diagnostics.

### Admin side (imnoshi-admin)

* `GET /admin/api/devices/[id]/command` command set extended with:
  `set_currency`, `set_mining_display`, `set_refresh_ms`,
  `set_currency_shuffle`, `set_paired_page_text`.
* Per-device command panel in `(admin)/devices` gains those commands.
* New migration: `20260907093004_device_state_overrides.sql` adds
  `device_state_overrides` (per-device display overrides) and
  `device_runtime_state` (firmware self-reports).

### Admin auth migrated off Clerk → email + password + Google Authenticator

* Replaced `@clerk/nextjs` with a self-contained admin auth layer:
  bcrypt password hashes, otplib TOTP, encrypted-at-rest TOTP secrets
  (AES-256-CTR keyed by `ADMIN_TOTP_ENC_KEY`), cookie-based sessions
  with a three-stage flow (`reset` → `totp` → `done`).
* New `public.admin_users` table seeded with two accounts:
  `escanor@imnoshi.com`, `var@imnoshi.com` (shared initial password
  `Imnoshi@2026`, both forced through a first-login setup wizard).
* Three new pages: `/login` (email + password), `/login/setup` (set new
  password + scan QR), `/login/verify` (6-digit TOTP), plus a new
  Settings tab `/settings` (TOTP status, change password, sign-out).
* Migration: `20260907100000_admin_password_totp.sql`.

### Customer app (imnoshi-web) also migrated off Clerk

* Same self-hosted email + password + optional Google Authenticator
  pattern. Customer TOTP is **optional** (enrolled from `/settings`
  later, no first-login forced reset per your choice).
* New `public.web_users` table for auth rows; the existing
  `public.users` rows for app profiles are now looked up by email
  rather than by deterministic UUID derived from a Clerk id.
* New pages: `/login`, `/register`, `/login/verify`.
  Replaced `LoginView`/`RegisterView` Clerk components with
  `LoginForm`/`RegisterForm`/`VerifyForm`.
* New API routes: `/api/auth/login`, `/api/auth/register`,
  `/api/auth/verify`, `/api/auth/logout`, `/api/auth/me`,
  `/api/auth/totp` (GET/POST/DELETE), `/api/auth/password`.
* Replaced `clerkIdToUuid` and `ensureDbUser(supabase, clerkId, email)`
  with `ensureDbUser(supabase, email)` -- generates a fresh
  `crypto.randomUUID()` for new sign-ups (the existing demo rows keep
  their hand-picked UUIDs).
* Migration: `20260907120000_web_user_auth.sql` (plus
  `20260907110000_web_schema_remaining.sql` to bring the DB up to
  parity with the Phase-2 schema -- previously the live DB was missing
  `monitor_devices`, `payout_destinations`, `purchase_inquiries`,
  `admin_audit_log`, `balance_ledger`, `payout_dispatches`,
  `device_pairings`, `device_commands`, `device_state_overrides`,
  `device_runtime_state`, `view_only_admins`).
* Seven demo customers seeded on `@imnoshi.com` (`alex.carter`,
  `priya.sharma`, `marcus.tan`, `elena.rossi`, `yuki.tanaka`,
  `aisha.mensah`, `diego.alvarez`) with bcrypt-hashed passwords of
  the form `<FirstName>-2026!`. Each gets a UID (`IMN-XXXX-XXXX-XXXX`),
  wallets (BTC/ETH/SOL), payout destinations, varied-status
  withdrawals, a balance ledger, and one monitor device. `priya.sharma`
  is pre-enrolled for TOTP so the `/login/verify` step can be exercised
  on a fresh install. Verified end-to-end via curl that login →
  /api/user → /api/wallets → /api/withdrawals → /api/devices →
  /api/payout-destinations return the right data for `alex.carter`.

### What's deliberately NOT in scope

* I am not rewriting your page system or replacing the Slabo16 font.
* I am not removing WiFiManager.
* The device still uses HTTP for telemetry. If you front it with a TLS
  reverse-proxy (or operate it on a closed LAN) it's fine; flagging it
  explicitly in case you want to pin certificate later.
* `include/Ubuntu16.h` is a perfect duplicate of `Slabo16.h` (same namespace,
  same data, same `#define UBUNTU16_H`). I'm leaving both files in place
  for now — once you've confirmed the duplicate is intentional / safe to
  delete, we can drop one.
