# Supreme Broccoli

Imnoshi is a multi-project quant platform comprising a customer dashboard, an administrative console, and an ESP32 monitor-node firmware.

## Projects

| Project | Description | Default port |
| --- | --- | --- |
| `imnoshi-web` | Customer-facing dashboard for monitor nodes, wallets, earnings, payouts, withdrawals. | 3000 |
| `imnoshi-admin` | Administrative console (full + view-only roles, audit log, device pairing). | 3001 |
| `imnoshi-module` | PlatformIO firmware for the ESP32 monitor node (IL9341 TFT, WiFi provisioning, telemetry). | N/A |

## Prerequisites

- Node.js 18.17 or newer
- npm
- PlatformIO Core (or the PlatformIO VS Code extension) for the device firmware
- A Clerk account (test keys are fine for development)
- A Supabase project

## First-Time Setup

```bash
# 1. Customer app
cd imnoshi-web
cp .env.example .env.local             # fill in Clerk + Supabase keys
npm install
npm run dev                            # http://localhost:3000

# 2. Admin app (separate terminal)
cd imnoshi-admin
cp .env.example .env.local             # add ADMIN_EMAILS / ADMIN_VIEW_EMAILS
npm install
npm run dev                            # http://localhost:3001
```

Both apps gracefully degrade to a "Clerk keys needed" screen if the envs are missing.

## Database

Apply these migrations to your Supabase project (in order, in the SQL editor):

1. `imnoshi-web/supabase/schema.sql`
2. `imnoshi-web/supabase/migrations/20260903021700_user_language_theme_preferences.sql`
3. `imnoshi-web/supabase/migrations/20260907093000_operational_hardening.sql`
4. `imnoshi-web/supabase/migrations/20260907093001_operational_hardening_part2.sql`
5. `imnoshi-web/supabase/migrations/20260907093002_device_commands.sql`
6. `imnoshi-web/supabase/migrations/20260907093003_rate_counter_function.sql`

Then seed five demo customers + four admin accounts:

```bash
psql ... -f imnoshi-web/supabase/seed.sql
```

Finally, create the matching Clerk users:

```bash
CLERK_SECRET_KEY=sk_test_... node imnoshi-web/scripts/seed-clerk.mjs
```

That creates:
* 5 customers at `demo1..demo5@example.com` (password `demo-pass-NNNN`)
* 2 full-admin accounts: `escanor@imnoshi.com`, `var@imnoshi.com`
* 2 view-only admins: `viewer1@imnoshi.com`, `viewer2@imnoshi.com`

(Replace these emails with whatever you actually control before exposing the admin publicly. The seed file inserts them as-is; afterwards, add your real operators to the `ADMIN_EMAILS` env in `imnoshi-admin/.env.local` and to the `public.view_only_admins` SQL table.)

## Admin Roles

| Role | Allowlist | Can do |
| --- | --- | --- |
| Full admin | `ADMIN_EMAILS` env | Approve withdrawals, record external payouts, grant VIP, push fleet snapshots, push device commands, adjust balances. Everything is recorded in `admin_audit_log`. |
| View-only admin | `ADMIN_VIEW_EMAILS` env or `public.view_only_admins` table | Read everything, including the audit log. Cannot perform any write (`POST/PATCH/DELETE`) on `/admin/api/*`. |

## Customer-Side Pairing Flow

1. Admin opens `/devices` on the admin app and submits the customer's email + a device name. A 6-character code is generated.
2. Customer signs in at `imnoshi-web`, opens the new "Pair Device" page (sidebar), enters the code.
3. Server flips the pairing row to `claimed` and returns a fresh **claim token** (SHA-256 stored).
4. The page shows a QR code (JSON of token + device id) for the device to scan via the IMNOSHI mobile companion app, or to be pasted over USB serial into the firmware.
5. Device polls `/api/devices/poll` every minute, sends telemetry to `POST /api/devices`.

## Customer Earnings Rule

A device only counts earnings while both `powerOk` AND `internetOk` are true. When the firmware reports either as `false`, the server still accepts the telemetry but doesn't roll up new USDT into the rewards table. As soon as both recover, the next telemetry republishes the live earnings.

This is enforced on the **server** (in `app/api/devices/route.ts` POST handler) so a compromised device cannot self-author income.

## External Payouts

Withdrawal processing is split into two phases to comply with KYC/AML expectations:

1. Admin approves the request (`/admin/api/withdrawals/decide`). The withdrawal flips to `processing`.
2. The operator executes the actual on-chain / banking transfer externally (from their treasury wallet / payment partner) and then records the external transaction hash via `/admin/api/withdrawals/complete`. The withdrawal flips to `completed`, a `payout_dispatches` row is written with the external tx hash, and a `balance_ledger` row marks the customer-side debit.

The `/admin/api/withdrawals/complete` endpoint never holds custody of customer funds -- it only records the proof.

## Device Firmware

```bash
cd imnoshi-module
pio run --target upload
pio device monitor
```

The ESP32 (`esp32dev`) brings up a TFT and one of three modes:
* **Setup** - opens a captive portal named `IMNOSHI-Setup` at `http://192.168.4.1`. The customer enters WiFi credentials; they're stored in NVS and the device reboots.
* **Pairing** - shows the 6-character pairing code that the customer redeems.
* **Online** - polls `/api/devices/poll`, sends telemetry, draws live USDT state.

It stops tallying earnings and reports `status=offline` if `internetOk` or `powerOk` go false.

## Repository Layout

```text
imnoshi-web/        Customer Next.js application
imnoshi-admin/      Admin Next.js application
imnoshi-module/     ESP32 PlatformIO firmware
```

## Git Hygiene

The root `.gitignore` excludes dependency folders, Next.js output, local environment files, logs, and PlatformIO build artifacts.