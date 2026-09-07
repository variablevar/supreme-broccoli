create table imo.devices (
  id uuid primary key default gen_random_uuid(), uid text not null unique,
  name text not null, credential_hash text not null unique,
  user_id uuid references imo.users(id), revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on imo.devices(user_id);
create table imo.device_pairings (
  code text primary key check(code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  device_id uuid not null references imo.devices(id), expires_at timestamptz not null,
  claimed_at timestamptz, created_at timestamptz not null default now()
);
create index on imo.device_pairings(device_id);
create table imo.device_publications (
  device_id uuid primary key references imo.devices(id), version integer not null check(version>0),
  content jsonb not null, published_by text not null, published_at timestamptz not null default now()
);
create table imo.device_runtime (
  device_id uuid primary key references imo.devices(id), firmware text not null,
  uptime_seconds bigint not null check(uptime_seconds >= 0), wifi_rssi integer not null check(wifi_rssi between -120 and 0),
  applied_version integer not null check(applied_version >= 0), last_seen timestamptz not null default now()
);

create function imo.issue_pairing(p_device_id uuid,p_code text) returns jsonb language plpgsql as $$
declare d imo.devices; pairing imo.device_pairings;
begin
  select * into d from imo.devices where id=p_device_id for update;
  if not found or d.revoked_at is not null then raise exception 'Device unavailable' using errcode='P0002'; end if;
  if d.user_id is not null then raise exception 'Device already paired' using errcode='22023'; end if;
  select * into pairing from imo.device_pairings where device_id=p_device_id and claimed_at is null and expires_at>now() order by created_at desc limit 1;
  if found then return jsonb_build_object('code',pairing.code,'expiresAt',pairing.expires_at); end if;
  insert into imo.device_pairings(code,device_id,expires_at) values(p_code,p_device_id,now()+interval '15 minutes') returning * into pairing;
  return jsonb_build_object('code',pairing.code,'expiresAt',pairing.expires_at);
end $$;

create function imo.claim_device(p_code text,p_user_id uuid) returns jsonb language plpgsql as $$
declare pairing imo.device_pairings; d imo.devices;
begin
  select * into pairing from imo.device_pairings where code=p_code;
  if not found then raise exception 'Pairing code invalid or expired' using errcode='22023'; end if;
  select * into d from imo.devices where id=pairing.device_id for update;
  select * into pairing from imo.device_pairings where code=p_code for update;
  if d.revoked_at is not null or pairing.expires_at<=now() then raise exception 'Pairing code invalid or expired' using errcode='22023'; end if;
  if d.user_id=p_user_id and pairing.claimed_at is not null then return jsonb_build_object('deviceId',d.id); end if;
  if d.user_id is not null or pairing.claimed_at is not null then raise exception 'Pairing code already claimed' using errcode='23505'; end if;
  update imo.devices set user_id=p_user_id where id=d.id;
  update imo.device_pairings set claimed_at=now() where code=p_code;
  return jsonb_build_object('deviceId',d.id);
end $$;

create function imo.publish_device(p_device_id uuid,p_content jsonb,p_expected_version integer,p_actor text) returns jsonb language plpgsql as $$
declare pub imo.device_publications; d imo.devices;
begin
  select * into d from imo.devices where id=p_device_id for update;
  if not found or d.revoked_at is not null then raise exception 'Device unavailable' using errcode='P0002'; end if;
  select * into pub from imo.device_publications where device_id=p_device_id;
  if coalesce(pub.version,0)<>p_expected_version then raise exception 'Publication changed. Refresh before editing.' using errcode='23505'; end if;
  insert into imo.device_publications(device_id,version,content,published_by) values(p_device_id,p_expected_version+1,p_content,p_actor)
  on conflict(device_id) do update set version=excluded.version,content=excluded.content,published_by=excluded.published_by,published_at=now() returning * into pub;
  insert into imo.admin_audit_log(actor_email,action,target_table,target_id,details) values(p_actor,'device.publish','devices',p_device_id::text,jsonb_build_object('version',pub.version,'content',p_content));
  return to_jsonb(pub);
end $$;

create function imo.sync_device(p_device_id uuid,p_firmware text,p_uptime bigint,p_rssi integer,p_applied integer) returns jsonb language plpgsql as $$
declare d imo.devices; pub imo.device_publications;
begin
  select * into d from imo.devices where id=p_device_id for update;
  if not found or d.revoked_at is not null then raise exception 'Device unavailable' using errcode='P0002'; end if;
  select * into pub from imo.device_publications where device_id=p_device_id;
  if p_applied>coalesce(pub.version,0) then raise exception 'Applied version is ahead of publication' using errcode='22023'; end if;
  insert into imo.device_runtime(device_id,firmware,uptime_seconds,wifi_rssi,applied_version) values(p_device_id,p_firmware,p_uptime,p_rssi,p_applied)
  on conflict(device_id) do update set firmware=excluded.firmware,uptime_seconds=excluded.uptime_seconds,wifi_rssi=excluded.wifi_rssi,applied_version=excluded.applied_version,last_seen=now();
  return jsonb_build_object('protocolVersion',1,'deviceId',d.id,'paired',d.user_id is not null,'publication',case when d.user_id is not null and pub.version is not null then jsonb_build_object('version',pub.version,'content',pub.content,'publishedAt',pub.published_at) else null end,'serverTime',now(),'pollAfterSeconds',15);
end $$;

create function imo.provision_device(p_uid text,p_name text,p_hash text,p_actor text) returns uuid language plpgsql as $$
declare device_id uuid;
begin
  insert into imo.devices(uid,name,credential_hash) values(p_uid,p_name,p_hash) returning id into device_id;
  insert into imo.admin_audit_log(actor_email,action,target_table,target_id) values(p_actor,'device.provision','devices',device_id::text);
  return device_id;
end $$;
create function imo.revoke_device(p_id uuid,p_actor text) returns void language plpgsql as $$
begin
  update imo.devices set revoked_at=coalesce(revoked_at,now()) where id=p_id;
  if not found then raise exception 'Device not found' using errcode='P0002'; end if;
  insert into imo.admin_audit_log(actor_email,action,target_table,target_id) values(p_actor,'device.revoke','devices',p_id::text);
end $$;

-- Explicit public DTOs exclude credential hashes and auth records.
create view imo.device_overview as select d.id,d.uid,d.name,d.user_id,d.revoked_at,
  p.version,p.content,p.published_at,r.applied_version,r.last_seen,r.firmware,
  (d.revoked_at is null and r.last_seen>now()-interval '90 seconds') as online
from imo.devices d left join imo.device_publications p on p.device_id=d.id left join imo.device_runtime r on r.device_id=d.id;

create function imo.customer_account(p_user_id uuid) returns jsonb language sql stable as $$
select jsonb_build_object(
  'profile',jsonb_build_object('id',u.id,'uid',u.uid,'email',u.email,'language',u.language_preference,'theme',u.theme_preference),
  'balance',b.balance::text,'reserved',b.reserved::text,'available',b.available::text,
  'address',(select to_jsonb(a)-'user_id' from imo.withdrawal_addresses a where a.user_id=u.id),
  'devices',coalesce((select jsonb_agg(to_jsonb(d) order by d.uid) from imo.device_overview d where d.user_id=u.id),'[]'::jsonb),
  'withdrawals',coalesce((select jsonb_agg(to_jsonb(w)||jsonb_build_object('amount',w.amount::text) order by w.created_at desc) from (select * from imo.withdrawals where user_id=u.id order by created_at desc limit 100) w),'[]'::jsonb),
  'ledger',coalesce((select jsonb_agg(to_jsonb(l)||jsonb_build_object('amount_usdt',l.amount_usdt::text) order by l.created_at desc) from (select * from imo.balance_ledger where user_id=u.id order by created_at desc limit 100) l),'[]'::jsonb)
) from imo.users u join imo.account_balances b on b.user_id=u.id where u.id=p_user_id;
$$;
create function imo.admin_overview() returns jsonb language sql stable as $$
select jsonb_build_object(
  'users',coalesce((select jsonb_agg(to_jsonb(u)||jsonb_build_object('balance',b.balance::text,'available',b.available::text,'reserved',b.reserved::text) order by u.created_at desc) from (select id,email,uid,created_at from imo.users order by created_at desc limit 200) u join imo.account_balances b on b.user_id=u.id),'[]'::jsonb),
  'devices',coalesce((select jsonb_agg(to_jsonb(d) order by d.uid) from (select * from imo.device_overview order by uid limit 200) d),'[]'::jsonb),
  'withdrawals',coalesce((select jsonb_agg(to_jsonb(w)||jsonb_build_object('amount',w.amount::text,'email',u.email) order by w.created_at desc) from (select * from imo.withdrawals order by created_at desc limit 200) w join imo.users u on u.id=w.user_id),'[]'::jsonb),
  'audit',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select * from imo.admin_audit_log order by created_at desc limit 100) a),'[]'::jsonb),
  'inquiries',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from (select * from imo.purchase_inquiries order by created_at desc limit 100) i),'[]'::jsonb)
);
$$;
