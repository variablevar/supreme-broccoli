-- Operational hardening: audit log, balance ledger, payout recording,
-- device pairing (rotating codes + claim tokens), VIP grants, view-only
-- admins, withdrawal approval trail. Purely additive.

-- ----- Admin audit log -----
create table if not exists public.admin_audit_log (
  id bigserial primary key,
  actor_email text not null,
  actor_role text not null check (actor_role in ('full', 'view')),
  action text not null,
  target_table text,
  target_id text,
  details jsonb,
  ip text,
  user_agent text,
  created_at timestamp with time zone default now()
);
create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_email, created_at desc);
alter table public.admin_audit_log enable row level security;

-- ----- View-only admin allowlist (in addition to ADMIN_VIEW_EMAILS env) -----
create table if not exists public.view_only_admins (
  email text primary key,
  note text,
  created_at timestamp with time zone default now()
);
alter table public.view_only_admins enable row level security;

-- ----- VIP grants (manually toggled by admin) -----
create table if not exists public.vip_grants (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  granted_by_email text not null,
  reason text,
  granted_at timestamp with time zone default now()
);
create index if not exists vip_grants_user_id_idx on public.vip_grants(user_id);
alter table public.vip_grants enable row level security;

-- ----- Balance ledger (every USDT movement) -----
-- Sign: +ve for credits to customer, -ve for debits.
create table if not exists public.balance_ledger (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  amount_usdt numeric(18, 8) not null,
  kind text not null check (kind in (
    'reward_mining','reward_llm','reward_exchange','reward_trading',
    'reward_manual','withdrawal_request','withdrawal_completed',
    'withdrawal_rejected_refund','admin_credit','admin_debit',
    'payout_recorded','correction'
  )),
  reference_id text,
  note text,
  created_at timestamp with time zone default now()
);
create index if not exists balance_ledger_user_id_idx
  on public.balance_ledger(user_id, created_at desc);
create index if not exists balance_ledger_kind_idx
  on public.balance_ledger(kind, created_at desc);
alter table public.balance_ledger enable row level security;
