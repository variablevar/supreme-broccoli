# TESTING.md — end-to-end live on-chain test (customer only)

This is the runbook for a **single-customer** end-to-end test on
the live IMNOSHI deployment. You will:

1.  Wipe the database to a customer-only state.
2.  Sign in as the customer.
3.  Connect a real Ethereum mainnet wallet.
4.  Have the admin send real USDT (and a bit of ETH for gas).
5.  Watch the dashboard flip the receipt from `pending` → `confirmed`.

> **Risk warning.** You are about to move real cryptocurrency on
> Ethereum mainnet. All transactions are final. Take a Supabase
> point-in-time backup **before** applying the wipe migration.
> Use small amounts (e.g. `0.0001 ETH` + `5 USDT`) for the test.

---

## 0. Prerequisites

* `pnpm` installed (`npm i -g pnpm@9`).
* Both apps set up: see `README.md` sections on `.env.local`.
* The Supabase project you're testing against is the **same one**
  the running `imnoshi-web` and `imnoshi-admin` apps talk to.
* MetaMask (or any EIP-1193 wallet) installed in your browser,
  loaded with the wallet that will receive the test funds. You
  should have at least `0.0001 ETH` for gas plus `5 USDT` on
  Ethereum mainnet available.
* `psql` or the Supabase dashboard SQL editor access to your
  project. **Take a backup first.**

---

## 1. Apply the migrations in order

In the Supabase SQL editor, run each file in `imnoshi-web/supabase/`
in chronological order:

```
20260903021700_user_language_theme_preferences.sql
20260907093000_operational_hardening.sql
20260907093001_operational_hardening_part2.sql
20260907093002_device_commands.sql
20260907093003_rate_counter_function.sql
20260907093004_device_state_overrides.sql
20260907100000_admin_password_totp.sql       -- admin_users + seed admins
20260907120000_web_user_auth.sql             -- web_users table
20260907200000_admin_pending_totp.sql
20260907900000_wipe_demo_customers.sql       -- *** truncates all demo data ***
```

After step `20260907100000_admin_password_totp.sql`, run
`pnpm bootstrap` from `imnoshi-admin/` to make sure the two admin
rows exist (if they were never seeded — idempotent upsert).

**After the wipe migration runs, only admin accounts and structural
tables remain.** Every demo customer, every device, every reward,
every withdrawal row is gone.

---

## 2. Bootstrap the test customer

From `imnoshi-web/`:

```bash
pnpm bootstrap
```

That inserts (idempotent):

* a row in `web_users` with email `customer@imnoshi.com` and
  password `Customer@2026!` (configurable via `CUSTOMER_EMAIL` /
  `CUSTOMER_PASSWORD` envs);
* a row in `public.users` with `uid='IMN-LIVE-0001'` so the
  dashboard's "ensureDbUser" path doesn't have to invent one.

---

## 3. Sign in as the customer

Boot the customer app:

```bash
cd imnoshi-web
pnpm dev           # http://localhost:3000
```

Open `http://localhost:3000/login`, sign in with:

* Email: `customer@imnoshi.com`
* Password: `Customer@2026!`

You're in.

> If you've enabled TOTP on this account, you'll be redirected to
> `/login/verify` and asked for a 6-digit code. Customers
> currently default to **no TOTP** (per the migration in
> `20260907120000_web_user_auth.sql`), so you shouldn't hit this.

---

## 4. Connect your real wallet

1. Go to `/wallet`.
2. In the **Connect wallet** card:
   * Either click **Connect MetaMask** (it pops a MetaMask window —
     approve), **or**
   * Paste your Ethereum mainnet address directly. The app
     normalizes it (`0x…` → lowercase) and saves it. The address is
     stored in `public.wallets` (symbol=`ETH`) and mirrored to
     `public.users.wallet_address`.

3. The **Live balance (Ethereum mainnet)** card immediately polls
   public RPCs (Cloudflare-ETH, LlamaRPC, Ankr) for native ETH +
   ERC-20 USDT balances. Refreshes every 30 s. Cached server-side
   for 30 s to stay under free-tier rate limits.

Expected:
* Before you fund it: `USDT: 0`, `ETH: 0`.
* After you send test funds: values update within ~30 s.

---

## 5. Fund the address from MetaMask

Open MetaMask on your Ethereum mainnet account and send to the
address you just connected:

| Asset | Amount | Why |
| --- | --- | --- |
| ETH  | `0.0001` | Gas for whatever you do later. |
| USDT (ERC-20) | `5` | Lets the dashboard show a non-zero ERC-20 balance. |

Copy the tx hash from MetaMask (click the transaction → "Copy
transaction ID"). You'll paste it on the admin side.

---

## 6. Sign in as admin and record the payout

Boot the admin app:

```bash
cd imnoshi-admin
pnpm dev           # http://localhost:3001
```

Sign in with `escanor@imnoshi.com` / `Imnoshi@2026` (the seed
admin). You'll be redirected to `/login/setup` to enrol TOTP on
first login.

> **Real on-chain transfers are NOT executed from the admin app.**
> The admin app **records** an external transfer that you made
> yourself (e.g. from MetaMask, your ops treasury wallet, or a
> custodial service). This is deliberate — holding a treasury
> private key server-side is money transmission in every
> jurisdiction. The admin app only writes the proof to
> `payout_dispatches`.

Pick a flow:

### Option A — record a withdrawal you "approved"

1. From the customer side, request a withdrawal (e.g. `5 USDT`)
   via `/withdrawals` (or just simulate one by inserting a
   `public.withdrawals` row directly via SQL).
2. On the admin side, `/withdrawals` → click **Approve** →
   status flips to `processing`.
3. Click **Mark Paid**, fill in:
   * network = `ERC20`
   * destination = the customer's address (pre-fill from the
     user's saved `payout_destinations.ETH` address)
   * external tx hash = the one MetaMask gave you
   * amount = `5`

### Option B — direct payout record

If you don't want to drive the full withdrawal flow, just record
the payout directly via SQL or `POST /admin/api/withdrawals/complete`
with the customer's `user_id` and the tx hash.

Either way, you'll end up with a row in `payout_dispatches` whose
`network='ERC20'` and `external_tx_hash=<your txid>`.

---

## 7. Watch the customer dashboard

Switch to the customer app. On `/transactions`, the new **On-chain
payout status** card polls `/api/payouts/verify` every 60 s. For
your payout:

* **First ~30 s** — `pending` — "tx not found yet" or "0/12 confirmations".
* **After ~1 block** — `pending` — "1/12 confirmations", "2/12 confirmations", ….
* **After 12 blocks (~3 min on Ethereum)** — flips to **`confirmed`**, and the server stamps `payout_dispatches.confirmed_at` with the timestamp.

The verifier also matches the ERC-20 `Transfer` event log against
the destination + amount you recorded. If anything's off:

* **`mismatch`** — either the destination wasn't your address, or
  the transferred amount was less than recorded.
* **`failed`** — the tx was reverted on-chain (status `0x0`).

Both are flagged immediately, not at the 12-confirmation mark,
because there's no point waiting if the tx reverted.

---

## 8. (Optional) Repeat

The wipe migration is idempotent. To re-run the test:

```bash
psql ... -f imnoshi-web/supabase/migrations/20260907900000_wipe_demo_customers.sql
cd imnoshi-admin && pnpm bootstrap    # admins stay
cd imnoshi-web && pnpm bootstrap      # re-seeds the customer
```

Everything except admin_users, admin_audit_log, and fleet_stats is
wiped. The customer app uses `ensureDbUser` to recreate a `users`
row automatically when you sign in, so the dashboard is fully
self-healing after the wipe.

---

## Files changed in this iteration

```
imnoshi-web/
  lib/web3/evm.ts                                       (new)
  components/dashboard/wallet/ConnectWallet.tsx         (new)
  app/api/wallets/connect/route.ts                      (new)
  app/api/wallets/balance/route.ts                      (new)
  app/api/payouts/verify/route.ts                       (new)
  app/(dashboard)/wallet/page.tsx                       (modified)
  app/(dashboard)/transactions/page.tsx                 (modified)
  scripts/bootstrap-customer.mjs                        (new)
  package.json                                          (modified)
  supabase/migrations/20260907900000_wipe_demo_customers.sql  (new)
```

## What's NOT in this iteration (deliberate)

* **No customer-side `eth_sendTransaction`.** The web app never
  signs transactions. It only reads balances and verifies that
  the admin's recorded payouts actually landed. If you want to
  wire a customer-side sender (so you can send *back* to the
  admin / treasury), that's Phase 2 — we'd add an ethers-v6 +
  MetaMask signer in the same ConnectWallet panel.
* **No TRON.** The verifier checks Ethereum mainnet only. TRON
  (TRC-20 USDT) is in scope for a later phase.
* **No webhook-driven verification.** The verifier is polled from
  the dashboard. For production you'd want a cron job hitting
  `/api/payouts/verify` every 30 s server-side so `confirmed_at`
  flips even when the customer isn't online.
* **Admin-side signing.** Out of scope for this iteration. The
  admin still has you paste the external tx hash manually.

## Troubleshooting

**`/api/wallets/balance` returns `connected: false` after I saved my address.**
The `ensureDbUser` flow might not have provisioned your `public.users`
row yet. Refresh once. The bootstrap script provisions it eagerly
but the dashboard's lazy path can race on cold start.

**On-chain status shows `rpc_unavailable`.**
The public RPCs (Cloudflare, Llama, Ankr) are flaky on occasion.
Re-try in a minute; the endpoint round-robins across all three.
The dashboard shows stale data when the cache is warm.

**On-chain status shows `pending` after 12 blocks.**
The verifier requires **exactly** 12 confirmations *since the
recorded payout's block*. If the tx was already a few blocks deep
when the admin recorded it, the head count might lag behind. Wait
one more refresh tick.

**`mismatch: no matching ERC-20 Transfer to destination`.**
The recorded destination string didn't match the lowercased
on-chain address. They look identical but one might have a
checksum mismatch. The verifier lowercases both sides, so the
real cause is probably that admin recorded a different chain's
address (e.g. typed a TRC-20 address into the `ERC20` destination
field). Fix the payout_dispatches row by hand.

**`Amount USDT mismatch`.**
You sent less than what was recorded. Either update the
`payout_dispatches.amount_usdt` to match what you actually sent, or
re-send the difference.

**The web app's `lib/web3/evm.ts` import errors with "ripemd160.js not found".**
That's a pre-existing issue from a stale pnpm install. Either
run `pnpm install` (workspace-level) or temporarily swap to the
`@noble/hashes/sha2.js` variant if you see it on a different
`@noble/hashes` version. Out of scope for this iteration.
