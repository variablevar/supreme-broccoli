# IMNOSHI — Monitor Node Engine

GPU-powered monitor node dashboard for UID-linked devices, USDT earnings, withdrawals, and multi-chain wallets.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind + shadcn/ui · Framer Motion / GSAP · React Three Fiber · Zustand · Clerk (auth) · Supabase (Postgres) · Recharts

## Local development

```bash
cp .env.example .env.local   # fill in Clerk + Supabase keys
npm install
npm run dev                  # http://localhost:3000
```

Note: Clerk development keys only work on the `localhost` origin. If you're on a remote/SSH machine, forward the port (`ssh -L 3000:localhost:3000 host`) or use VS Code's port forwarding, then browse `http://localhost:3000`.

## Database

Run `supabase/schema.sql` in the Supabase SQL editor (includes the wallets table and migration notes for older installs).

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework preset: Next.js — no config needed).
2. Add all `.env.example` variables in Vercel → Project → Environment Variables.
3. In the Clerk dashboard, create/use a **production** instance (dev keys are localhost-only):
   - Add your Vercel domain to the allowed origins
   - Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` to the `pk_live_…` / `sk_live_…` pair
   - Update `NEXT_PUBLIC_APP_URL` to your domain
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
