-- Demo seed: 7 production-style customer profiles with monitor devices,
-- wallets, payout destinations, withdrawals (in every status), rewards,
-- balance ledger, and fleet stats. Email domain is @imnoshi.com; UIDs
-- follow IMN-XXXX-XXXX-XXXX.
--
-- Each customer's bcrypt password_hash lives in public.web_users.
-- Login with email + the password listed below (e.g. alex.carter@imnoshi.com
-- / Carter-2026!).
--
-- Run this once after the migrations in supabase/migrations/ in the
-- Supabase SQL editor. The script is idempotent -- re-running it
-- leaves existing rows in place via on conflict do nothing.

-- ============================================================
-- Demo users (7) on @imnoshi.com
-- ============================================================
insert into public.users (id, uid, email, wallet_address, vip_status, language_preference, theme_preference, created_at)
values
  ('11111111-1111-1111-1111-111111111111', 'IMN-A1B2-C3D4', 'alex.carter@imnoshi.com',  '0x1111Carter00000000000000000000000000000a',  false, 'en-GB', 'dark',   now() - interval '40 days'),
  ('22222222-2222-2222-2222-222222222222', 'IMN-P7H8-M9N0', 'priya.sharma@imnoshi.com', '0x2222Sharma0000000000000000000000000000b',  true,  'en-GB', 'dark',   now() - interval '35 days'),
  ('33333333-3333-3333-3333-333333333333', 'IMN-T4N5-K6L7', 'marcus.tan@imnoshi.com',   '0x3333Marcus0000000000000000000000000000c',  false, 'en-GB', 'dark',   now() - interval '30 days'),
  ('44444444-4444-4444-4444-444444444444', 'IMN-R8S9-V0W1', 'elena.rossi@imnoshi.com',  '0x4444Rossi0000000000000000000000000000d',  false, 'en-US', 'system', now() - interval '20 days'),
  ('55555555-5555-5555-5555-555555555555', 'IMN-Y2K3-X4Z5', 'yuki.tanaka@imnoshi.com',  '0x5555Tanaka0000000000000000000000000000e',  true,  'ja',    'dark',   now() - interval '10 days'),
  ('66666666-6666-6666-6666-666666666666', 'IMN-M6N7-S8H9', 'aisha.mensah@imnoshi.com', '0x6666Mensah0000000000000000000000000000f',  false, 'en-GB', 'light',  now() - interval '7 days'),
  ('77777777-7777-7777-7777-777777777777', 'IMN-D0F1-G2H3', 'diego.alvarez@imnoshi.com','0x7777Alvarez00000000000000000000000000g',  false, 'es',    'dark',   now() - interval '3 days')
on conflict (id) do nothing;

-- ============================================================
-- Auth rows (web_users) with bcrypt password hashes for the same
-- seven customers. The password is "<FirstName>-2026!".
-- ============================================================
insert into public.web_users (email, password_hash, must_reset_password, totp_enrolled)
values
  ('alex.carter@imnoshi.com',   '$2b$10$sSFFR6kGWHaBjErxbEcUbu6h96Ik2dYl9Vr2tMMBsOy7jIq4DSrAq', false, false),
  ('priya.sharma@imnoshi.com',  '$2b$10$Ef2st9aWHM/mK/LHooqkUelEV2O/u4jziiyqPyJJy97scpw5ukNma', false, true),
  ('marcus.tan@imnoshi.com',    '$2b$10$VavLuE2.y5JirdQ79gbEx.rAUtddTwB78boCOBQ6iHhVoeIliQNTq', false, false),
  ('elena.rossi@imnoshi.com',   '$2b$10$26pdJFQoQYjwHkfYxLTxZ.JrQBMWgWjxm/61NRpqMzfys5P2yK3da', false, false),
  ('yuki.tanaka@imnoshi.com',   '$2b$10$QhSW31B0Mm70VkkptP1oi.LkIR8de3rtz3bROQG0jd2X5Xg8hssaG', false, false),
  ('aisha.mensah@imnoshi.com',  '$2b$10$uA.i1ejM1ORqDHxH7UwcxuTK1SwW0.Hi2hrJOL66sfU63siY9F5Sy', false, false),
  ('diego.alvarez@imnoshi.com', '$2b$10$xtcDhbo3oIdoihDFMK5HQukxc6XdFp/edaau1ePyDqvrdHJdhESmy', false, false)
on conflict (email) do update set password_hash = excluded.password_hash;
-- ============================================================
-- Wallets (1 set per user)
-- ============================================================
insert into public.wallets (user_id, symbol, chain, address)
values
  ('11111111-1111-1111-1111-111111111111', 'BTC', 'Bitcoin',  'bc1qCarter0000000000000000000000000000aaa'),
  ('11111111-1111-1111-1111-111111111111', 'ETH', 'Ethereum', '0x1111Carter00000000000000000000000000000a'),
  ('11111111-1111-1111-1111-111111111111', 'SOL', 'Solana',   'Carter111111111111111111111111111111111'),
  ('22222222-2222-2222-2222-222222222222', 'ETH', 'Ethereum', '0x2222Sharma0000000000000000000000000000b'),
  ('22222222-2222-2222-2222-222222222222', 'BTC', 'Bitcoin',  'bc1qSharma0000000000000000000000000000bbb'),
  ('33333333-3333-3333-3333-333333333333', 'ETH', 'Ethereum', '0x3333Marcus000000000000000000000000000c0'),
  ('44444444-4444-4444-4444-444444444444', 'ETH', 'Ethereum', '0x4444Rossi0000000000000000000000000000d'),
  ('44444444-4444-4444-4444-444444444444', 'SOL', 'Solana',   'Rossi4444444444444444444444444444444444'),
  ('55555555-5555-5555-5555-555555555555', 'ETH', 'Ethereum', '0x5555Tanaka0000000000000000000000000000e'),
  ('66666666-6666-6666-6666-666666666666', 'ETH', 'Ethereum', '0x6666Mensah0000000000000000000000000000f'),
  ('66666666-6666-6666-6666-666666666666', 'BTC', 'Bitcoin',  'bc1qMensah0000000000000000000000000000fff'),
  ('77777777-7777-7777-7777-777777777777', 'ETH', 'Ethereum', '0x7777Alvarez000000000000000000000000000g')
on conflict (user_id, symbol) do nothing;

-- ============================================================
-- Payout destinations
-- ============================================================
insert into public.payout_destinations (user_id, type, label, network, address)
values
  ('11111111-1111-1111-1111-111111111111', 'crypto', 'Main USDT (TRC20)', 'TRC20', 'TJR7Carter000000000000000000000000000a1'),
  ('11111111-1111-1111-1111-111111111111', 'crypto', 'Cold storage',     'ERC20', '0x1111Carter00000000000000000000000000aa'),
  ('22222222-2222-2222-2222-222222222222', 'crypto', 'Main USDT (TRC20)', 'TRC20', 'TJR7Sharma000000000000000000000000000a2'),
  ('22222222-2222-2222-2222-222222222222', 'crypto', 'Stablecoin hot',    'BEP20', '0x2222Sharma0000000000000000000000000b2'),
  ('33333333-3333-3333-3333-333333333333', 'crypto', 'Main USDT (TRC20)', 'TRC20', 'TJR7Marcus00000000000000000000000000a3'),
  ('44444444-4444-4444-4444-444444444444', 'crypto', 'Main USDT (TRC20)', 'TRC20', 'TJR7Rossi000000000000000000000000000a4'),
  ('55555555-5555-5555-5555-555555555555', 'crypto', 'Main USDT (TRC20)', 'TRC20', 'TJR7Tanaka00000000000000000000000000a5'),
  ('55555555-5555-5555-5555-555555555555', 'crypto', 'ERC20 reserve',     'ERC20', '0x5555Tanaka00000000000000000000000000e'),
  ('66666666-6666-6666-6666-666666666666', 'crypto', 'Main USDT (TRC20)', 'TRC20', 'TJR7Mensah00000000000000000000000000a6'),
  ('66666666-6666-6666-6666-666666666666', 'revolut', 'Revolut EUR',       null,    null),
  ('77777777-7777-7777-7777-777777777777', 'crypto', 'Main USDT (TRC20)', 'TRC20', 'TJR7Alvarez0000000000000000000000000a7'),
  ('77777777-7777-7777-7777-777777777777', 'revolut', 'Revolut EUR',       null,    null);

-- ============================================================
-- Monitor devices (one per customer, varied status)
-- ============================================================
insert into public.monitor_devices (uid, user_id, name, status, gpu_model, model_name, uptime_percent, hash_rate, ai_load, trading_load, today_usdt, total_usdt, last_seen, created_at)
values
  ('IMN-DE001B2C3', '11111111-1111-1111-1111-111111111111', 'Carter Node 01',  'online',     'NVIDIA RTX 4090',  'IMNOSHI Quant LLM', 99.2, 148.4, 51, 38, 18.42,  1284.80, now() - interval '30 seconds', now() - interval '40 days'),
  ('IMN-DE002P7H8', '22222222-2222-2222-2222-222222222222', 'Sharma Node 02',  'online',     'NVIDIA RTX 4090',  'IMNOSHI Quant LLM', 99.6, 152.1, 60, 41, 24.10,  1488.20, now() - interval '20 seconds', now() - interval '35 days'),
  ('IMN-DE003T4N5', '33333333-3333-3333-3333-333333333333', 'Tan Node 03',     'syncing',    'NVIDIA RTX 4080',  'IMNOSHI Quant LLM', 92.0, 121.0, 35, 22,  9.10,   734.30, now() - interval '10 minutes', now() - interval '30 days'),
  ('IMN-DE004R8S9', '44444444-4444-4444-4444-444444444444', 'Rossi Node 04',   'offline',    'NVIDIA RTX 4080',  'IMNOSHI Quant LLM',  0.0,   0.0,  0,  0,  0.00,   212.40, now() - interval '2 days',     now() - interval '20 days'),
  ('IMN-DE005Y2K3', '55555555-5555-5555-5555-555555555555', 'Tanaka Node 05',  'maintenance','NVIDIA RTX 4070',  'IMNOSHI Quant LLM', 80.0,  98.0, 28, 18,  4.30,   120.10, now() - interval '5 hours',    now() - interval '10 days'),
  ('IMN-DE006M6N7', '66666666-6666-6666-6666-666666666666', 'Mensah Node 06',  'online',     'NVIDIA RTX 3090',  'IMNOSHI Quant LLM', 97.8, 110.2, 42, 30, 14.20,   860.50, now() - interval '45 seconds', now() - interval '7 days'),
  ('IMN-DE007D0F1', '77777777-7777-7777-7777-777777777777', 'Alvarez Node 07', 'online',     'NVIDIA RTX 3090',  'IMNOSHI Quant LLM', 98.1, 102.5, 38, 27, 11.40,   415.70, now() - interval '60 seconds', now() - interval '3 days')
on conflict (uid) do nothing;

-- ============================================================
-- Withdrawals (varied statuses, across multiple users)
-- ============================================================
insert into public.withdrawals (user_id, amount, method, status, vip_withdrawal, created_at, processed_at, reviewed_by_email, reviewed_at, rejection_reason)
values
  ('11111111-1111-1111-1111-111111111111', 250.00, 'crypto', 'completed', false, now() - interval '15 days', now() - interval '15 days', 'escanor@imnoshi.com', now() - interval '15 days', null),
  ('11111111-1111-1111-1111-111111111111', 180.00, 'crypto', 'pending',   false, now() - interval '2 days',   null,                          'escanor@imnoshi.com', now() - interval '2 days',   null),
  ('22222222-2222-2222-2222-222222222222', 500.00, 'crypto', 'completed', true,  now() - interval '8 days',   now() - interval '8 days',   'escanor@imnoshi.com', now() - interval '8 days',   null),
  ('22222222-2222-2222-2222-222222222222', 300.00, 'bank',   'processing', true,  now() - interval '1 day',    null,                          'var@imnoshi.com',     now() - interval '6 hours', null),
  ('33333333-3333-3333-3333-333333333333', 120.00, 'crypto', 'rejected',   false, now() - interval '3 days',   now() - interval '3 days',   'escanor@imnoshi.com', now() - interval '3 days',   'Wrong address format'),
  ('55555555-5555-5555-5555-555555555555', 100.00, 'crypto', 'pending',   true,  now() - interval '4 days',   null,                          'var@imnoshi.com',     now() - interval '4 days',  null),
  ('66666666-6666-6666-6666-666666666666', 220.00, 'bank',   'completed', false, now() - interval '20 days',  now() - interval '20 days',  'escanor@imnoshi.com', now() - interval '20 days',  null);

-- ============================================================
-- Balance ledger (single source of truth for balances)
-- ============================================================
insert into public.balance_ledger (user_id, amount_usdt, kind, note, created_at) values
  ('11111111-1111-1111-1111-111111111111',  320.50, 'reward_mining',   'Carter seed',  now() - interval '8 days'),
  ('11111111-1111-1111-1111-111111111111',  145.20, 'reward_llm',      'Carter seed',  now() - interval '12 days'),
  ('11111111-1111-1111-1111-111111111111',  210.00, 'reward_exchange', 'Carter seed',  now() - interval '20 days'),
  ('11111111-1111-1111-1111-111111111111',   90.00, 'reward_trading',  'Carter seed',  now() - interval '30 days'),
  ('11111111-1111-1111-1111-111111111111', -250.00, 'payout_recorded', 'Carter seed',  now() - interval '15 days'),
  ('22222222-2222-2222-2222-222222222222',  480.00, 'reward_mining',   'Sharma seed',  now() - interval '6 days'),
  ('22222222-2222-2222-2222-222222222222',  280.00, 'reward_llm',      'Sharma seed',  now() - interval '14 days'),
  ('22222222-2222-2222-2222-222222222222',  350.00, 'reward_exchange', 'Sharma seed',  now() - interval '22 days'),
  ('22222222-2222-2222-2222-222222222222', -500.00, 'payout_recorded', 'Sharma seed',  now() - interval '8 days'),
  ('33333333-3333-3333-3333-333333333333',  180.00, 'reward_mining',   'Tan seed',     now() - interval '10 days'),
  ('44444444-4444-4444-4444-444444444444',  212.40, 'reward_mining',   'Rossi seed',   now() - interval '18 days'),
  ('55555555-5555-5555-5555-555555555555',  115.80, 'reward_mining',   'Tanaka seed',  now() - interval '9 days'),
  ('66666666-6666-6666-6666-666666666666',  430.10, 'reward_mining',   'Mensah seed',  now() - interval '5 days'),
  ('66666666-6666-6666-6666-666666666666',  175.00, 'reward_llm',      'Mensah seed',  now() - interval '11 days'),
  ('66666666-6666-6666-6666-666666666666', -220.00, 'payout_recorded', 'Mensah seed',  now() - interval '20 days'),
  ('77777777-7777-7777-7777-777777777777',  102.50, 'reward_mining',   'Alvarez seed', now() - interval '2 days'),
  ('77777777-7777-7777-7777-777777777777',   45.30, 'reward_trading',  'Alvarez seed', now() - interval '6 days');

-- ============================================================
-- Recorded external payouts (matches the completed withdrawals)
-- ============================================================
insert into public.payout_dispatches
  (withdrawal_id, user_id, network, destination, amount_usdt, external_tx_hash, operator_email, executed_at, confirmed_at)
select id, user_id, 'TRC20',
       (select address from public.payout_destinations
          where payout_destinations.user_id = withdrawals.user_id and network = 'TRC20' limit 1),
       amount,
       'TX-CARTER-0001',
       'escanor@imnoshi.com',
       now() - interval '15 days', now() - interval '15 days'
from public.withdrawals where status = 'completed' and user_id = '11111111-1111-1111-1111-111111111111' limit 1;

insert into public.payout_dispatches
  (withdrawal_id, user_id, network, destination, amount_usdt, external_tx_hash, operator_email, executed_at, confirmed_at)
select id, user_id, 'TRC20',
       (select address from public.payout_destinations
          where payout_destinations.user_id = withdrawals.user_id and network = 'TRC20' limit 1),
       amount,
       'TX-SHARMA-0001',
       'escanor@imnoshi.com',
       now() - interval '8 days', now() - interval '8 days'
from public.withdrawals where status = 'completed' and user_id = '22222222-2222-2222-2222-222222222222' limit 1;

insert into public.payout_dispatches
  (withdrawal_id, user_id, network, destination, amount_usdt, external_tx_hash, operator_email, executed_at, confirmed_at)
select id, user_id, 'BANK',
       (select label from public.payout_destinations
          where payout_destinations.user_id = withdrawals.user_id and type = 'revolut' limit 1),
       amount,
       'TX-MENSAH-0001',
       'escanor@imnoshi.com',
       now() - interval '20 days', now() - interval '20 days'
from public.withdrawals where status = 'completed' and user_id = '66666666-6666-6666-6666-666666666666' limit 1;

-- ============================================================
-- Rewards (mining-only, matching the monitor device telemetry)
-- ============================================================
insert into public.rewards (user_id, amount, source, status, created_at, claimed_at)
values
  ('11111111-1111-1111-1111-111111111111', 18.42,  'mining', 'claimed', now() - interval '8 days',  now() - interval '7 days'),
  ('11111111-1111-1111-1111-111111111111', 19.10,  'mining', 'claimed', now() - interval '1 day',   now() - interval '12 hours'),
  ('22222222-2222-2222-2222-222222222222', 24.10,  'mining', 'claimed', now() - interval '2 days',  now() - interval '1 day'),
  ('33333333-3333-3333-3333-333333333333',  9.10,  'mining', 'pending', now() - interval '6 hours', null),
  ('66666666-6666-6666-6666-666666666666', 14.20,  'mining', 'claimed', now() - interval '3 days',  now() - interval '2 days'),
  ('77777777-7777-7777-7777-777777777777', 11.40,  'mining', 'pending', now() - interval '12 hours', null);

-- ============================================================
-- Fleet stats + history (live ticker)
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
