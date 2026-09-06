# IMNOSHI — Monitor Node Engine

GPU-powered monitor node dashboard for UID-linked devices, USDT earnings, withdrawals, and multi-chain wallets.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind + shadcn/ui · Framer Motion / GSAP · React Three Fiber · Zustand · bcryptjs + otplib (self-hosted email + password + optional TOTP) · Supabase (Postgres) · Recharts

## Local development

```bash
cp .env.example .env.local   # fill in Supabase + CUSTOMER_TOTP_ENC_KEY
npm install
npm run dev                  # http://localhost:3000
```

## Database

Apply, in order, in the Supabase SQL editor:

1. `supabase/schema.sql`
2. `supabase/migrations/20260903021700_user_language_theme_preferences.sql`
3. `supabase/migrations/20260907093000_operational_hardening.sql`
4. `supabase/migrations/20260907093001_operational_hardening_part2.sql`
5. `supabase/migrations/20260907093002_device_commands.sql`
6. `supabase/migrations/20260907093003_rate_counter_function.sql`
7. `supabase/migrations/20260907093004_device_state_overrides.sql`
8. `supabase/migrations/20260907110000_web_schema_remaining.sql`
9. `supabase/migrations/20260907120000_web_user_auth.sql`
10. `supabase/seed.sql` — demo customers + wallet/withdrawal/fleet seed data

Seven demo customers on `@imnoshi.com` are seeded as part of `seed.sql`. Each uses the password `<FirstName>-2026!` (e.g. `alex.carter@imnoshi.com` / `Carter-2026!`). See the root README for the full table. `priya.sharma@imnoshi.com` is pre-enrolled for TOTP so you can exercise the `/login/verify` step on a fresh install. New registrations get their own email + password (≥10 chars). TOTP enrollment is optional and done from `/settings`.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework preset: Next.js — no config needed).
2. Add all `.env.example` variables in Vercel → Project → Environment Variables. Set `CUSTOMER_TOTP_ENC_KEY` to a 32+ character random string.
3. Update `NEXT_PUBLIC_APP_URL` to your domain.
4. Deploy. Supabase needs no changes (it's already remote).

## Fleet stats (marketing ticker)

The landing-page ticker reads the latest row of `fleet_stats` via `GET /api/fleet`. Update it from your ops tooling:

```bash
curl -X POST https://your-domain/api/fleet \
  -H "Authorization: Bearer $FLEET_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"total_gpus":1240,"active_miners":856,"total_hashrate":4200,"daily_rewards":12480}'
```

## Earnings

Customer earnings are recorded in USDT from mining, LLM work, exchange activity,
and trading. Users can settle pending earnings into their dashboard balance.

## Withdrawal rules

Withdrawals have a 100 USDT minimum and are available once every 7 days.
Users can pay out to saved crypto wallets or Revolut bank details.
