-- Per-device display overrides: pushed from the admin UI via the
-- existing /admin/api/devices/[id]/command route, then read by the
-- device's GET /api/devices/state so the firmware reflects what the
-- admin set.

create table if not exists public.device_state_overrides (
  device_id uuid primary key references public.monitor_devices(id) on delete cascade,
  currency text check (currency in ('BTC','ETH','SOL','DOGE','LTC','XMR','PEARL')),
  mining_display text check (mining_display in ('hashrate','apr','both')),
  refresh_ms int check (refresh_ms between 2000 and 60000),
  currency_shuffle boolean default true,
  paired_page_text text default 'Enter this code at /devices/pair',
  updated_by_email text,
  updated_at timestamp with time zone default now()
);
alter table public.device_state_overrides enable row level security;

-- Firmware self-reports: page index, brightness, free heap,
-- RSSI. Used for diagnostics and to figure out where a unit is in
-- its display cycle. Written by POST /api/devices/config.
create table if not exists public.device_runtime_state (
  device_id uuid primary key references public.monitor_devices(id) on delete cascade,
  current_page int,
  brightness_pct int,
  free_heap int,
  wifi_rssi int,
  uptime_seconds bigint,
  firmware text,
  last_seen timestamp with time zone default now()
);
alter table public.device_runtime_state enable row level security;

-- Index used by the admin devices table when sorting by last-touch.
create index if not exists device_runtime_state_last_seen_idx
  on public.device_runtime_state (last_seen desc);
