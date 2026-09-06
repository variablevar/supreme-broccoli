-- Wipe demo customers + all their dependent rows.
--
-- KEEPS:
--   * admin_users          -- so escanor/var can still log in
--   * admin_audit_log      -- accumulated history stays
--   * fleet_stats          -- last marketing-ticker snapshot stays
--   * rate_counters        -- ephemeral, harmless to keep
--   * All structural tables + indexes + RLS policies
--
-- This is intentionally idempotent (TRUNCATE ... RESTART IDENTITY
-- CASCADE). Re-runnable.
--
-- IMPORTANT: take a Supabase point-in-time backup BEFORE applying.
-- The wipe is irreversible from SQL alone.

truncate table
  public.device_commands,
  public.device_runtime_state,
  public.device_state_overrides,
  public.device_pairings,
  public.monitor_devices,
  public.payout_dispatches,
  public.balance_ledger,
  public.withdrawals,
  public.rewards,
  public.payout_destinations,
  public.wallets,
  public.vip_grants,
  public.purchase_inquiries,
  public.users
restart identity cascade;
