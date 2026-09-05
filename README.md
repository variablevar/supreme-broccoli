# Supreme Broccoli

Imnoshi is a multi-project quant platform comprising a customer dashboard, an administrative console, and an ESP32 monitor-node firmware.

## Projects

| Project | Description | Default port |
| --- | --- | --- |
| `imnoshi-web` | Customer-facing dashboard for monitor nodes, wallets, earnings, payouts, withdrawals. | 3000 |
| `imnoshi-admin` | Administrative console (email + password + Google Authenticator 2FA, audit log, device pairing). | 3001 |
| `imnoshi-module` | PlatformIO firmware for the ESP32 monitor node (IL9341 TFT, WiFi provisioning, telemetry). | N/A |

## Prerequisites

- Node.js 18.17 or newer
- npm
- PlatformIO Core (or the PlatformIO VS Code extension) for the device firmware
- A Supabase project

## First-Time Setup

```bash
# 1. Customer app
cd imnoshi-web
cp .env.example .env.local             # fill in Supabase + CUSTOMER_TOTP_ENC_KEY
npm install
npm run dev                            # http://localhost:3000

# 2. Admin app (separate terminal)
cd imnoshi-admin
cp .env.example .env.local             # add ADMIN_EMAILS / SUPABASE_* / ADMIN_TOTP_ENC_KEY
npm install
npm run dev                            # http://localhost:3001
```

Both apps use built-in email + password + Google Authenticator auth — no Clerk required.

## Database

Apply these migrations to your Supabase project (in order, in the SQL editor):

1. `imnoshi-web/supabase/schema.sql`
2. `imnoshi-web/supabase/migrations/20260903021700_user_language_theme_preferences.sql`
3. `imnoshi-web/supabase/migrations/20260907093000_operational_hardening.sql`
4. `imnoshi-web/supabase/migrations/20260907093001_operational_hardening_part2.sql`
5. `imnoshi-web/supabase/migrations/20260907093002_device_commands.sql`
6. `imnoshi-web/supabase/migrations/20260907093003_rate_counter_function.sql`
7. `imnoshi-web/supabase/migrations/20260907093004_device_state_overrides.sql`
8. `imnoshi-web/supabase/migrations/20260907100000_admin_password_totp.sql`
9. `imnoshi-web/supabase/migrations/20260907110000_web_schema_remaining.sql`
10. `imnoshi-web/supabase/migrations/20260907120000_web_user_auth.sql`

Then seed the customer demo data:

```bash
psql ... -f imnoshi-web/supabase/seed.sql
```

That creates 7 demo customers on `@imnoshi.com`:

| Email | Password | UID | VIP | TOTP |
| --- | --- | --- | --- | --- |
| `alex.carter@imnoshi.com`   | `Carter-2026!`  | `IMN-A1B2-C3D4` | no  | no |
| `priya.sharma@imnoshi.com`  | `Sharma-2026!`  | `IMN-P7H8-M9N0` | yes | yes |
| `marcus.tan@imnoshi.com`    | `Tan-2026!`     | `IMN-T4N5-K6L7` | no  | no |
| `elena.rossi@imnoshi.com`   | `Rossi-2026!`   | `IMN-R8S9-V0W1` | no  | no |
| `yuki.tanaka@imnoshi.com`   | `Tanaka-2026!`  | `IMN-Y2K3-X4Z5` | yes | no |
| `aisha.mensah@imnoshi.com`  | `Mensah-2026!`  | `IMN-M6N7-S8H9` | no  | no |
| `diego.alvarez@imnoshi.com` | `Alvarez-2026!` | `IMN-D0F1-G2H3` | no  | no |

Each account also has pre-loaded wallets, payout destinations, withdrawal history, rewards ledger, and one monitor device (in varied statuses: online / syncing / offline / maintenance). `priya.sharma@imnoshi.com` is seeded with `totp_enrolled=true` so you can exercise the `/login/verify` step on a fresh install.

## Admin Auth

The admin app authenticates with **email + password + Google Authenticator TOTP**, fully self-contained — no Clerk required.

* Migration #8 seeds `public.admin_users` with two rows: `escanor@imnoshi.com` and `var@imnoshi.com`, both with `must_reset_password=true` and the bcrypt-hashed shared initial password `Imnoshi@2026`.
* `ADMIN_EMAILS` in `imnoshi-admin/.env` is the allowlist (currently set to just those two).
* First login forces a setup wizard: pick a new password (≥10 chars) and scan a QR code with Google Authenticator (or any TOTP app) to enroll the second factor.
* Subsequent logins prompt for email + password, then the 6-digit TOTP code at `/login/verify`.
* TOTP secrets are AES-256-CTR encrypted with a key derived from `ADMIN_TOTP_ENC_KEY` (falls back to `SUPABASE_SERVICE_ROLE_KEY`).
* Account lockout: 5 failed attempts → 15-minute lock.
* Admins can change their own password from `/settings` at any time.

(Replace the seeded emails with whatever you actually control before exposing the admin publicly. To add or remove operators, edit `ADMIN_EMAILS` and the `public.admin_users` table — and rotate `ADMIN_TOTP_ENC_KEY` whenever an operator leaves.)

## Customer Auth

The customer app (`imnoshi-web`) authenticates with **email + password + optional Google Authenticator TOTP** — also no Clerk.

* Migration #10 creates `public.web_users` for auth (bcrypt password hash + encrypted TOTP secret).
* New registrations create **both** a `web_users` row (auth) and a `public.users` row (app profile: UID, wallet address, language/theme), linked by email.
* Demo accounts (`alex.carter@imnoshi.com`, etc.) use their seeded passwords indefinitely — no forced reset, as you specified. They can enroll TOTP later from `/settings`.
* TOTP is fully optional for customers. Enrolled customers go through an extra `/login/verify` step; non-enrolled customers sign straight in.
* `CUSTOMER_TOTP_ENC_KEY` symmetric-encrypts the TOTP secret at rest; falls back to `SUPABASE_SERVICE_ROLE_KEY` if unset. Set a dedicated 32+ character random string in production.
* Account lockout: 5 failed attempts → 15-minute lock.

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