-- Admin authentication: password + TOTP (Google Authenticator).
-- Replaces the previous Clerk-based admin auth. Stores bcrypt-hashed
-- passwords and an encrypted TOTP secret per admin account. The two
-- default accounts are seeded with the shared initial password
-- 'Imnoshi@2026' (bcrypt hash below) and `must_reset_password = true`
-- so they're forced through the first-login setup wizard.

create extension if not exists pgcrypto;

create table public.admin_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password_hash text not null,
  totp_secret_encrypted bytea,
  totp_enrolled boolean not null default false,
  must_reset_password boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamp with time zone,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists admin_users_email_idx on public.admin_users(email);

alter table public.admin_users enable row level security;

-- No public RLS: the admin app accesses this table with the service-role
-- key only. Lock out anon/authenticated roles defensively.
create policy "Deny all direct access to admin_users"
  on public.admin_users
  for all
  using (false)
  with check (false);

-- Seed the two default admin accounts. Password hash is bcrypt of
-- 'Imnoshi@2026' (cost 10) -- generated with bcryptjs. Both rows are
-- forced to reset on first login and have no TOTP secret yet.
--
-- If you regenerate the password elsewhere, replace this hash. To do
-- so locally:
--   node -e "console.log(require('bcryptjs').hashSync('NEW_PASSWORD',10))"
insert into public.admin_users (email, password_hash, must_reset_password)
values
  ('escanor@imnoshi.com', '$2b$10$Ed183aVPXCa5Jx.h85ho.eV6mkNVyVZ90CeUfKgSJWoHZjRshE1Fm', true),
  ('var@imnoshi.com',     '$2b$10$Ed183aVPXCa5Jx.h85ho.eV6mkNVyVZ90CeUfKgSJWoHZjRshE1Fm', true)
on conflict (email) do nothing;

-- Maintain updated_at.
create or replace function public.admin_users_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists admin_users_touch on public.admin_users;
create trigger admin_users_touch
  before update on public.admin_users
  for each row execute function public.admin_users_touch_updated_at();