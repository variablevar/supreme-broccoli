-- Bring imnoshi-web's database up to parity with the live schema.
--
-- Creates the tables that schema.sql referenced but no migration ever
-- created: monitor_devices, payout_destinations, purchase_inquiries.
-- Also adds the user-language/theme columns that schema.sql declared
-- inline (we never ran the original schema.sql wholesale because the
-- app auth model was Clerk, not Supabase Auth).
--
-- Self-hosted auth note: this app does NOT use Supabase Auth. RLS
-- policies in schema.sql used `auth.uid()`, which won't actually
-- match our app's user ids. The app uses the service-role key for all
-- DB access and enforces row scoping itself. We therefore enable RLS
-- on these tables without any per-row policy -- access is gated by the
-- service-role secret at the application layer.

-- ===== monitor_devices =====
create table if not exists public.monitor_devices (
  id uuid default gen_random_uuid() primary key,
  uid text unique not null,
  user_id uuid references public.users(id) on delete set null,
  name text,
  status text default 'offline' check (status in ('online','offline','syncing','maintenance')),
  gpu_model text,
  model_name text,
  uptime_percent numeric(5,2) default 0,
  hash_rate numeric(18,2) default 0,
  ai_load numeric(5,2) default 0,
  trading_load numeric(5,2) default 0,
  today_usdt numeric(18,8) default 0,
  total_usdt numeric(18,8) default 0,
  last_seen timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists monitor_devices_user_id_idx on public.monitor_devices(user_id);

-- ===== payout_destinations =====
-- Matches the original schema.sql: a destination is either a 'crypto'
-- address (with network = TRC20|ERC20|BEP20|SOL) or a 'revolut' tag.
-- No network enum here -- network is a free text constrained only by
-- the check, matching what the existing app code expects.
create table if not exists public.payout_destinations (
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
create index if not exists payout_destinations_user_id_idx on public.payout_destinations(user_id);

-- ===== purchase_inquiries =====
create table if not exists public.purchase_inquiries (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  quantity int not null default 1,
  device_price_gbp int not null default 3000,
  status text not null default 'new' check (status in ('new','contacted','paid','paired','cancelled')),
  created_at timestamp with time zone default now()
);

-- ===== user preferences columns =====
alter table public.users
  add column if not exists language_preference text default 'en-GB',
  add column if not exists theme_preference text default 'dark';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_language_preference_check') then
    alter table public.users
      add constraint users_language_preference_check
      check (language_preference in ('bn','ar','ur','pk','hi','en-US','en-GB','de','ja','zh','nl','es','fr'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_theme_preference_check') then
    alter table public.users
      add constraint users_theme_preference_check
      check (theme_preference in ('dark','light','system'));
  end if;
end $$;

update public.users
set
  language_preference = coalesce(language_preference, 'en-GB'),
  theme_preference = coalesce(theme_preference, 'dark');

-- ===== withdrawals review-trail columns (also added in part 2, but be idempotent) =====
alter table public.withdrawals
  add column if not exists reviewed_by_email text,
  add column if not exists reviewed_at timestamp with time zone,
  add column if not exists rejection_reason text;

create index if not exists withdrawals_reviewed_at_idx
  on public.withdrawals(reviewed_at desc) where reviewed_at is not null;
create index if not exists withdrawals_status_idx
  on public.withdrawals(status);

-- ===== monitor_devices.uid index (also added in part 2) =====
create index if not exists monitor_devices_uid_idx
  on public.monitor_devices(uid);

-- ===== Enable RLS on the new tables =====
alter table public.monitor_devices enable row level security;
alter table public.payout_destinations enable row level security;
alter table public.purchase_inquiries enable row level security;

-- Drop any legacy schema.sql RLS policies that referenced auth.uid() --
-- those policies would never match anyway under self-hosted auth.
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('users','stakes','rewards','withdrawals','wallets','monitor_devices','payout_destinations','purchase_inquiries')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;