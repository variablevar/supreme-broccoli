-- Add destination columns to withdrawals. The original schema.sql
-- declares these, but the live project was created from an older
-- state that omitted them. Apply once on existing deployments.
--
-- We don't add a foreign key to public.payout_destinations(id)
-- because the customer's payout_destinations may have been deleted
-- after a withdrawal was opened. The label is denormalized.
alter table public.withdrawals
  add column if not exists destination_id uuid,
  add column if not exists destination_label text;
