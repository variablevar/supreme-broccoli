-- Operational hardening part 2: payout dispatches, device pairing,
-- withdrawal approval trail, balance view.

-- ----- Payout dispatches -----
-- A "payout" records an outbound USDT transfer executed by the operator
-- off-chain (from our treasury / payment partner). The external tx hash
-- is the proof on whichever network we used. balance_ledger captures the
-- customer-side effect.
create table if not exists public.payout_dispatches (
  id uuid default gen_random_uuid() primary key,
  withdrawal_id uuid references public.withdrawals(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  network text not null check (network in ('TRC20','ERC20','BEP20','SOL','BANK')),
  destination text not null,
  amount_usdt numeric(18, 8) not null,
  external_tx_hash text not null,
  operator_email text not null,
  executed_at timestamp with time zone default now(),
  confirmed_at timestamp with time zone
);
create index if not exists payout_dispatches_user_id_idx
  on public.payout_dispatches(user_id, executed_at desc);
create index if not exists payout_dispatches_external_tx_hash_idx
  on public.payout_dispatches(external_tx_hash);
alter table public.payout_dispatches enable row level security;

-- ----- Device pairing (rotating codes + claim tokens) -----
-- Device shows a 6-char code on TFT, customer enters it on /devices/pair,
-- server creates the row with status='claimed'. Device polls, persists the
-- bearer token in NVS, and starts posting telemetry.
create table if not exists public.device_pairings (
  code text primary key,
  status text not null default 'pending'
    check (status in ('pending','claimed','revoked')),
  claim_token text,
  device_id uuid references public.monitor_devices(id) on delete set null,
  user_id uuid references public.users(id) on delete cascade,
  created_by_email text,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
create index if not exists device_pairings_status_idx
  on public.device_pairings(status);
alter table public.device_pairings enable row level security;

-- Index on monitor_devices.uid so the device ingest route can find a
-- device quickly by its public UID.
create index if not exists monitor_devices_uid_idx
  on public.monitor_devices(uid);

-- ----- Withdrawal approval trail -----
alter table public.withdrawals
  add column if not exists reviewed_by_email text,
  add column if not exists reviewed_at timestamp with time zone,
  add column if not exists rejection_reason text;

-- ----- Reconstructible customer balance (view only) -----
create or replace view public.customer_balance_v as
select
  user_id,
  coalesce(sum(case when amount_usdt > 0 then amount_usdt else 0 end), 0) as total_credits,
  coalesce(sum(case when amount_usdt < 0 then -amount_usdt else 0 end), 0) as total_debits,
  coalesce(sum(amount_usdt), 0) as balance
from public.balance_ledger
group by user_id;
