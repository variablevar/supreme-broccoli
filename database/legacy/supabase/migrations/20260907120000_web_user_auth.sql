-- Customer authentication: email + password + optional Google Authenticator.
--
-- Self-contained auth for imnoshi-web customers (replaces the previous
-- Clerk integration). One row per email, linked to the existing
-- public.users row by email so we don't need to reshape any existing
-- tables.
--
-- TOTP is OPTIONAL for customers -- admins are forced through setup
-- on first login, but customers can enroll later from /settings. This
-- matches the option the user picked: "no forced reset, demo accounts
-- work with original demo passwords forever".

create extension if not exists pgcrypto;

create table if not exists public.web_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password_hash text not null,
  totp_secret_encrypted bytea,
  totp_enrolled boolean not null default false,
  must_reset_password boolean not null default false,
  failed_attempts int not null default 0,
  locked_until timestamp with time zone,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists web_users_email_idx on public.web_users(email);

alter table public.web_users enable row level security;

-- No public RLS access -- only the service-role key touches this table.
create policy "Deny all direct access to web_users"
  on public.web_users
  for all
  using (false)
  with check (false);

create or replace function public.web_users_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists web_users_touch on public.web_users;
create trigger web_users_touch
  before update on public.web_users
  for each row execute function public.web_users_touch_updated_at();