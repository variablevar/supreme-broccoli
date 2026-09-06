-- Add destination columns to withdrawals. The original schema.sql
-- declares these, but the live project was created from an older
-- state that omitted them. Apply once on existing deployments.
--
-- We declare a foreign key to public.payout_destinations(id) so
-- PostgREST can resolve the join used by the admin's overview
-- page (lib/adminData.ts). Without this FK, the join returns
-- "Could not find a relationship between 'withdrawals' and
-- 'payout_destinations' in the schema cache".
--
-- The FK is ON DELETE SET NULL because a customer's saved payout
-- destination may be deleted after a withdrawal was opened --
-- the row stays, the link is just broken.
alter table public.withdrawals
  add column if not exists destination_id uuid,
  add column if not exists destination_label text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'withdrawals_destination_id_fkey'
      and conrelid = 'public.withdrawals'::regclass
  ) then
    alter table public.withdrawals
      add constraint withdrawals_destination_id_fkey
      foreign key (destination_id)
      references public.payout_destinations(id)
      on delete set null;
  end if;
end $$;

-- PostgREST caches schema; nudge it to reload so the join works
-- without waiting for the next schema-cache TTL.
notify pgrst, 'reload schema';
