-- Demo seed: 5 customer profiles, monitor devices, rewards, payouts,
-- withdrawals (in every status), and the 4 admin accounts (2 full,
-- 2 view-only). Passwords and Clerk IDs are placeholders -- run
-- scripts/seed-clerk.mjs to create the corresponding Clerk users.
--
-- The user_id values are pre-generated UUIDs (matching what
-- clerkIdToUuid() produces for the placeholder Clerk IDs), so the
-- /devices/pair / dashboard / withdrawals flows just work after
-- you register with those emails in Clerk.

-- Disable RLS briefly so we can populate demo data without juggling
-- JWTs. The app uses the service-role key in production anyway.
--
-- Run this once in the Supabase SQL editor.

-- ============================================================
-- Demo users (5)
-- ============================================================
insert into public.users (id, uid, email, wallet_address, vip_status, language_preference, theme_preference, created_at)
values
  ('11111111-1111-1111-1111-111111111111', 'IMN-DEMO-0001', 'demo1@example.com', '0x1111111111111111111111111111111111111111', false, 'en-GB', 'dark', now() - interval '40 days'),
  ('22222222-2222-2222-2222-222222222222', 'IMN-DEMO-0002', 'demo2@example.com', '0x2222222222222222222222222222222222222222', true,  'en-GB', 'dark', now() - interval '35 days'),
  ('33333333-3333-3333-3333-333333333333', 'IMN-DEMO-0003', 'demo3@example.com', '0x3333333333333333333333333333333333333333', false, 'bn',    'dark', now() - interval '30 days'),
  ('44444444-4444-4444-4444-444444444444', 'IMN-DEMO-0004', 'demo4@example.com', '0x4444444444444444444444444444444444444444', false, 'ar',    'dark', now() - interval '20 days'),
  ('55555555-5555-5555-5555-555555555555', 'IMN-DEMO-0005', 'demo5@example.com', '0x5555555555555555555555555555555555555555', false, 'hi',    'dark', now() - interval '10 days')
on conflict (id) do nothing;

-- ============================================================
-- Wallets (1 set per user)
-- ============================================================
insert into public.wallets (user_id, symbol, chain, address)
values
  ('11111111-1111-1111-1111-111111111111', 'BTC', 'Bitcoin',  'bc1qdemo0000000000000000000000000000000aaa'),
  ('11111111-1111-1111-1111-111111111111', 'ETH', 'Ethereum', '0x1111111111111111111111111111111111111111'),
  ('11111111-1111-1111-1111-111111111111', 'SOL', 'Solana',   'Demo111111111111111111111111111111111111'),
  ('22222222-2222-2222-2222-222222222222', 'ETH', 'Ethereum', '0x2222222222222222222222222222222222222222'),
  ('33333333-3333-3333-3333-333333333333', 'ETH', 'Ethereum', '0x3333333333333333333333333333333333333333'),
  ('44444444-4444-4444-4444-444444444444', 'ETH', 'Ethereum', '0x4444444444444444444444444444444444444444'),
  ('55555555-5555-5555-5555-555555555555', 'ETH', 'Ethereum', '0x5555555555555555555555555555555555555555')
on conflict (user_id, symbol) do nothing;

-- ============================================================
-- Payout destinations
-- ============================================================
insert into public.payout_destinations (user_id, type, label, network, address)
values
  ('11111111-1111-1111-1111-111111111111', 'crypto', 'Main USDT (TRC20)', 'TRC20', 'TJR7Demo000000000000000000000000000000a1'),
  ('22222222-2222-2222-2222-222222222222', 'crypto', 'Main USDT (ERC20)', 'ERC20', '0x2222222222222222222222222222222222222222'),
  ('33333333-3333-3333-3333-333333333333', 'crypto', 'Main USDT (TRC20)', 'TRC20', 'TJR7Demo000000000000000000000000000000a3'),
  ('44444444-4444-4444-4444-444444444444', 'crypto', 'Main USDT (TRC20)', 'TRC20', 'TJR7Demo000000000000000000000000000000a4'),
  ('55555555-5555-5555-5555-555555555555', 'crypto', 'Main USDT (TRC20)', 'TRC20', 'TJR7Demo000000000000000000000000000000a5');

-- ============================================================
-- Monitor devices (one per customer, varied status)
-- ============================================================
insert into public.monitor_devices
  (uid, user_id, name, status, gpu_model, model_name, uptime_percent, hash_rate, ai_load, trading_load, today_usdt, total_usdt, last_seen, created_at)
values
  ('IMN-DEMO-0001', '11111111-1111-1111-1111-111111111111', 'Monitor Node 01', 'online',   'Dedicated RTX 4090',  'IMNOSHI Quant LLM', 99.2, 148.4, 51, 38, 18.42, 1284.80,  now() - interval '30 seconds', now() - interval '40 days'),
  ('IMN-DEMO-0002', '22222222-2222-2222-2222-222222222222', 'Monitor Node 02', 'online',   'Dedicated RTX 4090',  'IMNOSHI Quant LLM', 99.6, 152.1, 60, 41, 24.10, 1488.20,  now() - interval '20 seconds', now() - interval '35 days'),
  ('IMN-DEMO-0003', '33333333-3333-3333-3333-333333333333', 'Monitor Node 03', 'syncing',  'Dedicated RTX 4080',  'IMNOSHI Quant LLM', 92.0, 121.0, 35, 22,  9.10,  734.30,  now() - interval '10 minutes', now() - interval '30 days'),
  ('IMN-DEMO-0004', '44444444-4444-4444-4444-444444444444', 'Monitor Node 04', 'offline',  'Dedicated RTX 4080',  'IMNOSHI Quant LLM',  0.0,   0.0,  0,  0,  0.00,  212.40,  now() - interval '2 days',     now() - interval '20 days'),
  ('IMN-DEMO-0005', '55555555-5555-5555-5555-555555555555', 'Monitor Node 05', 'maintenance','Dedicated RTX 4070', 'IMNOSHI Quant LLM', 80.0,  98.0, 28, 18,  4.30,  120.10,  now() - interval '5 hours',    now() - interval '10 days')
on conflict (uid) do nothing;

-- ============================================================
-- Withdrawals (every status represented)
-- ============================================================
insert into public.withdrawals
  (user_id, amount, method, status, vip_withdrawal, created_at, processed_at, reviewed_by_email, reviewed_at, rejection_reason)
values
  ('11111111-1111-1111-1111-111111111111', 250.00, 'crypto', 'completed',  false, now() - interval '15 days', now() - interval '15 days', 'escanor@imnoshi.com', now() - interval '15 days', null),
  ('11111111-1111-1111-1111-111111111111', 180.00, 'crypto', 'pending',    false, now() - interval '2 hours',  null,                          null,                       null,                       null),
  ('22222222-2222-2222-2222-222222222222', 500.00, 'crypto', 'completed',  true,  now() - interval '8 days',  now() - interval '8 days',  'escanor@imnoshi.com', now() - interval '8 days',  null),
  ('22222222-2222-2222-2222-222222222222', 300.00, 'bank',   'processing', true,  now() - interval '1 day',   null,                          'var@imnoshi.com',     now() - interval '6 hours', null),
  ('33333333-3333-3333-3333-333333333333', 120.00, 'crypto', 'rejected',   false, now() - interval '3 days',  now() - interval '3 days',  'escanor@imnoshi.com', now() - interval '3 days',  'Wrong address format');

-- ============================================================
-- Balance ledger (single source of truth for balances)
-- ============================================================
insert into public.balance_ledger (user_id, amount_usdt, kind, note, created_at) values
  ('11111111-1111-1111-1111-111111111111',  320.50, 'reward_mining',   'demo seed', now() - interval '8 days'),
  ('11111111-1111-1111-1111-111111111111',  145.20, 'reward_llm',      'demo seed', now() - interval '12 days'),
  ('11111111-1111-1111-1111-111111111111',  210.00, 'reward_exchange', 'demo seed', now() - interval '20 days'),
  ('11111111-1111-1111-1111-111111111111',   90.00, 'reward_trading',  'demo seed', now() - interval '30 days'),
  ('11111111-1111-1111-1111-111111111111', -250.00, 'payout_recorded', 'demo seed', now() - interval '15 days'),
  ('22222222-2222-2222-2222-222222222222',  480.00, 'reward_mining',   'demo seed', now() - interval '6 days'),
  ('22222222-2222-2222-2222-222222222222',  280.00, 'reward_llm',      'demo seed', now() - interval '14 days'),
  ('22222222-2222-2222-2222-222222222222',  350.00, 'reward_exchange', 'demo seed', now() - interval '22 days'),
  ('22222222-2222-2222-2222-222222222222', -500.00, 'payout_recorded', 'demo seed', now() - interval '8 days'),
  ('33333333-3333-3333-3333-333333333333',  180.00, 'reward_mining',   'demo seed', now() - interval '10 days'),
  ('44444444-4444-4444-4444-444444444444',  212.40, 'reward_mining',   'demo seed', now() - interval '18 days'),
  ('55555555-5555-5555-5555-555555555555',  115.80, 'reward_mining',   'demo seed', now() - interval '9 days');
-- ============================================================
-- Recorded external payout (matches the 250 USDT withdrawal above)
-- ============================================================
insert into public.payout_dispatches
  (withdrawal_id, user_id, network, destination, amount_usdt, external_tx_hash, operator_email, executed_at, confirmed_at)
select id, user_id, 'TRC20',
       (select address from public.payout_destinations
          where payout_destinations.user_id = withdrawals.user_id and network = 'TRC20' limit 1),
       amount,
       'TX-DEMO-0001',
       'escanor@imnoshi.com',
       now() - interval '15 days', now() - interval '15 days'
from public.withdrawals where status = 'completed' and amount = 250.00 limit 1;

-- ============================================================
-- Fleet stats + history
-- ============================================================
insert into public.fleet_stats (total_gpus, active_miners, total_hashrate, daily_rewards, updated_at) values
  (1240, 856, 4200, 12480, now() - interval '6 hours'),
  (1212, 821, 4080, 11820, now() - interval '30 hours'),
  (1180, 798, 3950, 11125, now() - interval '3 days');

-- ============================================================
-- View-only admins (in addition to ADMIN_VIEW_EMAILS env)
-- ============================================================
insert into public.view_only_admins (email, note) values
  ('viewer1@imnoshi.com', 'Operational reporting'),
  ('viewer2@imnoshi.com', 'Finance review')
on conflict (email) do nothing;
