-- Users table (stores app-level user data)
-- NOTE: This app authenticates with Clerk, not Supabase Auth, so `id` is a
-- deterministic UUID derived from the Clerk user ID (see lib/userId.ts).
-- Do NOT add `references auth.users` here — there is no Supabase auth user.
create table public.users (
  id uuid primary key,
  uid text unique not null,
  email text unique not null,
  wallet_address text,
  vip_status boolean default false,
  language_preference text default 'en-GB' check (language_preference in ('bn','ar','ur','pk','hi','en-US','en-GB','de','ja','zh','nl','es','fr')),
  theme_preference text default 'dark' check (theme_preference in ('dark','light','system')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Legacy internal capital positions. This is not exposed to customers.
create table public.stakes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  amount decimal(18,8) not null,
  lock_period_months int not null check (lock_period_months in (1,3,6,12)),
  apy decimal(5,2) not null,
  started_at timestamp with time zone default now(),
  ends_at timestamp with time zone not null,
  status text default 'active' check (status in ('active','completed','cancelled')),
  reward_multiplier decimal(3,2) default 1.0
);

-- Rewards / Polls
create table public.rewards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  amount decimal(18,8) not null,
  source text not null check (source in ('mining','llm','exchange','trading')),
  status text default 'pending' check (status in ('pending','claimed')),
  created_at timestamp with time zone default now(),
  claimed_at timestamp with time zone
);

-- Withdrawals
create table public.withdrawals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  amount decimal(18,8) not null,
  method text not null check (method in ('crypto','bank')),
  status text default 'pending' check (status in ('pending','processing','completed','rejected')),
  vip_withdrawal boolean default false,
  destination_id uuid,
  destination_label text,
  created_at timestamp with time zone default now(),
  processed_at timestamp with time zone
);

-- GPU fleet stats (for live ticker)
create table public.fleet_stats (
  id serial primary key,
  total_gpus int default 0,
  active_miners int default 0,
  total_hashrate decimal(18,2) default 0,
  daily_rewards decimal(18,8) default 0,
  updated_at timestamp with time zone default now()
);

-- Seed one row so the marketing ticker has data:
--   insert into public.fleet_stats (total_gpus, active_miners, total_hashrate, daily_rewards)
--   values (1240, 856, 4200, 12480);
-- Or push updates via POST /api/fleet with header:
--   Authorization: Bearer <FLEET_ADMIN_SECRET>

-- Wallet addresses (public addresses only — seed phrases NEVER stored here)
create table public.wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  symbol text not null,
  chain text not null,
  address text not null,
  created_at timestamp with time zone default now(),
  unique(user_id, symbol)
);

-- Monitor nodes paired to customer UIDs. The physical monitor device belongs
-- to the customer; GPU/AI/exchange infrastructure remains operated by IMNOSHI.
create table public.monitor_devices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  uid text not null,
  name text not null,
  status text default 'syncing' check (status in ('online','syncing','offline','maintenance')),
  gpu_model text default 'Dedicated GPU Lane',
  model_name text default 'IMNOSHI Quant LLM',
  uptime_percent decimal(5,2) default 0,
  hash_rate decimal(18,4) default 0,
  ai_load int default 0 check (ai_load >= 0 and ai_load <= 100),
  trading_load int default 0 check (trading_load >= 0 and trading_load <= 100),
  today_usdt decimal(18,8) default 0,
  total_usdt decimal(18,8) default 0,
  last_seen timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Customer payout destinations for USDT or Revolut withdrawals.
create table public.payout_destinations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  type text not null check (type in ('crypto','revolut')),
  label text not null,
  network text check (network in ('TRC20','ERC20','BEP20','SOL')),
  address text,
  revolut_name text,
  revolut_tag text,
  iban text,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Public purchase/reservation requests for £3,000 monitor nodes.
create table public.purchase_inquiries (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  quantity int not null default 1,
  device_price_gbp int not null default 3000,
  status text not null default 'new' check (status in ('new','contacted','paid','paired','cancelled')),
  created_at timestamp with time zone default now()
);

-- Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.stakes enable row level security;
alter table public.rewards enable row level security;
alter table public.withdrawals enable row level security;
alter table public.wallets enable row level security;
alter table public.monitor_devices enable row level security;
alter table public.payout_destinations enable row level security;

create policy "Users can read own data" on public.users
  for select using (auth.uid() = id);

create policy "Users can read own stakes" on public.stakes
  for select using (auth.uid() = user_id);

create policy "Users can read own rewards" on public.rewards
  for select using (auth.uid() = user_id);

create policy "Users can read own withdrawals" on public.withdrawals
  for select using (auth.uid() = user_id);

create policy "Users can read own wallets" on public.wallets
  for select using (auth.uid() = user_id);

create policy "Users can read own monitor devices" on public.monitor_devices
  for select using (auth.uid() = user_id);

create policy "Users can read own payout destinations" on public.payout_destinations
  for select using (auth.uid() = user_id);

-- Migration for existing projects (run once in the Supabase SQL editor):
--
--   create table public.wallets (
--     id uuid default gen_random_uuid() primary key,
--     user_id uuid references public.users(id) on delete cascade,
--     symbol text not null,
--     chain text not null,
--     address text not null,
--     created_at timestamp with time zone default now(),
--     unique(user_id, symbol)
--   );
--   alter table public.wallets enable row level security;
--   create policy "Users can read own wallets" on public.wallets
--     for select using (auth.uid() = user_id);

-- Migration for projects that ran the original schema with the
-- `references auth.users` foreign key on public.users:
--
--   alter table public.users drop constraint users_id_fkey;

-- Migration for projects that ran the original schema with the
-- `references auth.users` foreign key on public.users:
--
--   alter table public.users drop constraint users_id_fkey;
--
-- Operational tables (audit log, balance ledger, payout dispatches,
-- device pairing, withdrawal approval trail) live in their own
-- migration files in this folder:
--
--   20260907093000_operational_hardening.sql
--   20260907093001_operational_hardening_part2.sql
--
-- Apply the original language/theme migration and both operational
-- migrations before running seed.sql.

-- Indexes used by the admin queues.
create index if not exists withdrawals_reviewed_at_idx
  on public.withdrawals(reviewed_at desc) where reviewed_at is not null;
create index if not exists withdrawals_status_idx
  on public.withdrawals(status);