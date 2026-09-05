-- Device command inbox: admins write, the firmware polls and consumes.
-- Commands are pushed from /admin/api/devices/[id]/command and consumed
-- by /api/devices/poll on imnoshi-web.
create table if not exists public.device_commands (
  id uuid default gen_random_uuid() primary key,
  device_id uuid not null references public.monitor_devices(id) on delete cascade,
  command text not null check (command in (
    'push_config', 'reset_claim', 'set_status', 'force_telemetry_ping'
  )),
  payload jsonb,
  created_by_email text,
  consumed_at timestamp with time zone,
  consumed_status text,
  created_at timestamp with time zone default now()
);
create index if not exists device_commands_device_pending_idx
  on public.device_commands(device_id, created_at)
  where consumed_at is null;
alter table public.device_commands enable row level security;

-- Per-IP daily counters for the telemetry endpoint. Reset once a day.
create table if not exists public.rate_counters (
  bucket_date date not null,
  scope text not null,                 -- e.g. 'telemetry:1.2.3.4'
  count int not null default 0,
  primary key (bucket_date, scope)
);
alter table public.rate_counters enable row level security;
