-- Pending TOTP secret during enrollment.
--
-- When a user starts TOTP enrollment (POST /api/auth/setup or
-- /api/auth/totp), the server generates a fresh secret, encrypts it,
-- and stores it here with a short expiry. The client renders the QR
-- from this secret, and the confirming POST reads the SAME secret back
-- from the DB to verify the submitted 6-digit code.
--
-- Without this, every call to createEnrollment() would mint a brand-new
-- secret, so the user's authenticator app and the verifying server
-- would be looking at different secrets and verification would always
-- fail.
--
-- Expiry is 10 minutes -- enough to scan the QR + enter the code, not
-- enough to leave stale entries around if the user walks away.

alter table public.admin_users
  add column if not exists pending_totp_secret bytea,
  add column if not exists pending_totp_secret_expires_at timestamp with time zone;

alter table public.web_users
  add column if not exists pending_totp_secret bytea,
  add column if not exists pending_totp_secret_expires_at timestamp with time zone;

-- Optional cleanup helper for any cron job you want to wire up:
-- delete from public.admin_users
--   where pending_totp_secret is not null
--     and pending_totp_secret_expires_at < now();
-- delete from public.web_users
--   where pending_totp_secret is not null
--     and pending_totp_secret_expires_at < now();