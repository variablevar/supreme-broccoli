-- Fresh Imo namespace. Does not read, mutate, or reset the legacy public schema.
create schema if not exists imo;
create table imo.users (
  id uuid primary key default gen_random_uuid(),
  uid text not null unique,
  email text not null unique check (email = lower(email)),
  language_preference text not null default 'en-GB' check (language_preference in ('bn','ar','ur','pk','hi','en-US','en-GB','de','ja','zh','nl','es','fr')),
  theme_preference text not null default 'dark' check (theme_preference in ('dark','light','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table imo.web_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references imo.users(id),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  totp_secret_encrypted bytea,
  totp_enrolled boolean not null default false,
  must_reset_password boolean not null default false,
  pending_totp_secret bytea,
  pending_totp_secret_expires_at timestamptz,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  session_version integer not null default 1,
  created_at timestamptz not null default now()
);
create table imo.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  totp_secret_encrypted bytea,
  totp_enrolled boolean not null default false,
  must_reset_password boolean not null default true,
  pending_totp_secret bytea,
  pending_totp_secret_expires_at timestamptz,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  session_version integer not null default 1,
  created_at timestamptz not null default now()
);
create table imo.app_sessions (
  token_hash text primary key,
  audience text not null check (audience in ('customer','admin')),
  subject_id uuid not null,
  user_id uuid references imo.users(id),
  email text not null,
  stage text not null check (stage in ('reset','totp','done')),
  session_version integer not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on imo.app_sessions(expires_at);
create function imo.invalidate_sessions() returns trigger language plpgsql as $$
begin
  if new.password_hash is distinct from old.password_hash or new.totp_secret_encrypted is distinct from old.totp_secret_encrypted or new.totp_enrolled is distinct from old.totp_enrolled then
    new.session_version := old.session_version + 1;
  end if;
  return new;
end $$;
create trigger invalidate_sessions before update on imo.web_users for each row execute function imo.invalidate_sessions();
create trigger invalidate_sessions before update on imo.admin_users for each row execute function imo.invalidate_sessions();

create table imo.rate_limits (
  scope text primary key,
  attempts integer not null,
  resets_at timestamptz not null
);
create function imo.take_rate_limit(p_scope text, p_limit integer, p_window_seconds integer) returns boolean language plpgsql as $$
declare n integer;
begin
  insert into imo.rate_limits(scope, attempts, resets_at) values (p_scope, 1, now()+make_interval(secs=>p_window_seconds))
  on conflict(scope) do update set attempts = case when imo.rate_limits.resets_at <= now() then 1 else imo.rate_limits.attempts+1 end,
    resets_at = case when imo.rate_limits.resets_at <= now() then now()+make_interval(secs=>p_window_seconds) else imo.rate_limits.resets_at end
  returning attempts into n;
  return n <= p_limit;
end $$;

create function imo.register_customer(p_email text, p_password_hash text, p_uid text) returns jsonb language plpgsql as $$
declare u imo.users; a imo.web_users;
begin
  insert into imo.users(email, uid) values (lower(p_email), p_uid) returning * into u;
  insert into imo.web_users(email, user_id, password_hash) values (u.email, u.id, p_password_hash) returning * into a;
  return jsonb_build_object('id',a.id,'email',a.email,'user_id',u.id,'uid',u.uid);
end $$;

create table imo.admin_audit_log (
  id uuid primary key default gen_random_uuid(), actor_email text not null, actor_role text not null default 'full',
  action text not null, target_table text, target_id text, details jsonb, ip text, user_agent text,
  created_at timestamptz not null default now()
);
create table imo.purchase_inquiries (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null, phone text,
  quantity integer not null check(quantity > 0), device_price_gbp integer not null default 3000,
  status text not null default 'new', created_at timestamptz not null default now()
);
create table imo.fleet_stats (
  id uuid primary key default gen_random_uuid(), total_gpus integer not null default 0,
  active_miners integer not null default 0, total_hashrate numeric not null default 0,
  daily_rewards numeric not null default 0, updated_at timestamptz not null default now()
);
-- Browser roles receive no access to this namespace. Final permissions migration
-- grants backend service_role only after every table/function exists.
revoke all on schema imo from public;
revoke all on all functions in schema imo from public;
