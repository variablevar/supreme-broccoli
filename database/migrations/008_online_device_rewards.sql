alter table imo.balance_ledger drop constraint balance_ledger_kind_check;
alter table imo.balance_ledger add constraint balance_ledger_kind_check
  check(kind in ('admin_adjustment','withdrawal_paid','device_daily_reward'));

create table imo.device_reward_state (
  device_id uuid primary key references imo.devices(id) on delete cascade,
  accumulated_online_seconds bigint not null default 0 check(accumulated_online_seconds between 0 and 86399),
  daily_usdt numeric(20,6) not null default 0 check(daily_usdt between 0 and 999999999.999999),
  last_heartbeat_at timestamptz,
  credited_cycles bigint not null default 0 check(credited_cycles>=0),
  updated_at timestamptz not null default now()
);
alter table imo.device_reward_state enable row level security;

create function imo.publication_daily_usdt(p_content jsonb) returns numeric language plpgsql immutable as $$
declare value text:=p_content->>'dailyUsdt';
begin
  if value is null or value !~ '^(0|[1-9][0-9]{0,8})(\.[0-9]{1,6})?$' then return 0; end if;
  return value::numeric(20,6);
end $$;

create function imo.reset_device_reward_rate() returns trigger language plpgsql as $$
begin
  insert into imo.device_reward_state(device_id,daily_usdt,last_heartbeat_at)
  values(new.device_id,imo.publication_daily_usdt(new.content),null)
  on conflict(device_id) do update set
    accumulated_online_seconds=0,
    daily_usdt=excluded.daily_usdt,
    last_heartbeat_at=null,
    updated_at=now();
  return new;
end $$;
create trigger reset_device_reward_after_publication
after insert or update of content on imo.device_publications
for each row execute function imo.reset_device_reward_rate();

-- Normalize publications created by protocol v1 before the expanded metric set.
update imo.device_publications set content=jsonb_build_object(
  'title',coalesce(content->>'title','Imo'),
  'message',coalesce(content->>'message',''),
  'currency',case when content->>'currency' in ('BTC','ETH','SOL','DOGE','LTC','XMR','PEARL') then content->>'currency' else 'BTC' end,
  'isStaking',coalesce((content->>'isStaking')::boolean,false),
  'rate',case when content->>'rate' ~ '^(0|[1-9][0-9]{0,7})(\.[0-9]{1,3})?$' then content->>'rate' else '0' end,
  'dailyUsdt',case when content->>'dailyUsdt' ~ '^(0|[1-9][0-9]{0,8})(\.[0-9]{1,6})?$' then content->>'dailyUsdt' else '0' end,
  'downloadMbps',coalesce(content->>'downloadMbps','0'),
  'uploadMbps',coalesce(content->>'uploadMbps','0'),
  'watts',coalesce(content->>'watts','0'),
  'energyTodayWh',coalesce(content->>'energyTodayWh','0')
);

insert into imo.device_reward_state(device_id,daily_usdt)
select device_id,imo.publication_daily_usdt(content) from imo.device_publications
on conflict(device_id) do nothing;

create function imo.accrue_online_device_reward(p_device_id uuid,p_now timestamptz default now()) returns jsonb language plpgsql as $$
declare
  d imo.devices;
  reward imo.device_reward_state;
  elapsed bigint:=0;
  new_seconds bigint;
  entry_id uuid;
  credited numeric(20,6):=0;
begin
  select * into d from imo.devices where id=p_device_id for update;
  if not found or d.revoked_at is not null then raise exception 'Device unavailable' using errcode='P0002'; end if;
  insert into imo.device_reward_state(device_id,daily_usdt)
  values(p_device_id,coalesce((select imo.publication_daily_usdt(content) from imo.device_publications where device_id=p_device_id),0))
  on conflict(device_id) do nothing;
  select * into reward from imo.device_reward_state where device_id=p_device_id for update;

  if reward.last_heartbeat_at is not null then
    elapsed:=greatest(0,floor(extract(epoch from p_now-reward.last_heartbeat_at))::bigint);
    if elapsed>40 then elapsed:=0; end if;
  end if;
  new_seconds:=reward.accumulated_online_seconds+elapsed;

  if d.user_id is not null and reward.daily_usdt>0 and new_seconds>=86400 then
    entry_id:=gen_random_uuid();
    credited:=reward.daily_usdt;
    insert into imo.balance_ledger(user_id,amount_usdt,kind,reference_id,note,actor_email)
    values(d.user_id,credited,'device_daily_reward',entry_id,'Daily online reward for '||d.uid,'system:device-reward');
    insert into imo.admin_audit_log(actor_email,action,target_table,target_id,details)
    values('system:device-reward','device.reward.credited','balance_ledger',entry_id::text,
      jsonb_build_object('device_id',d.id,'device_uid',d.uid,'user_id',d.user_id,'amount',credited::text));
    new_seconds:=new_seconds-86400;
    reward.credited_cycles:=reward.credited_cycles+1;
  end if;

  update imo.device_reward_state set
    accumulated_online_seconds=new_seconds,
    last_heartbeat_at=p_now,
    credited_cycles=reward.credited_cycles,
    updated_at=p_now
  where device_id=p_device_id returning * into reward;
  return jsonb_build_object(
    'creditedUsdt',credited::text,
    'onlineSeconds',reward.accumulated_online_seconds,
    'nextRewardSeconds',86400-reward.accumulated_online_seconds,
    'creditedCycles',reward.credited_cycles
  );
end $$;

create or replace function imo.sync_device(p_device_id uuid,p_firmware text,p_uptime bigint,p_rssi integer,p_applied integer) returns jsonb language plpgsql as $$
declare d imo.devices; pub imo.device_publications; reward jsonb; account jsonb;
begin
  select * into d from imo.devices where id=p_device_id for update;
  if not found or d.revoked_at is not null then raise exception 'Device unavailable' using errcode='P0002'; end if;
  select * into pub from imo.device_publications where device_id=p_device_id;
  if p_applied>coalesce(pub.version,0) then raise exception 'Applied version is ahead of publication' using errcode='22023'; end if;
  reward:=imo.accrue_online_device_reward(p_device_id,clock_timestamp());
  insert into imo.device_runtime(device_id,firmware,uptime_seconds,wifi_rssi,applied_version) values(p_device_id,p_firmware,p_uptime,p_rssi,p_applied)
  on conflict(device_id) do update set firmware=excluded.firmware,uptime_seconds=excluded.uptime_seconds,wifi_rssi=excluded.wifi_rssi,applied_version=excluded.applied_version,last_seen=now();
  if d.user_id is not null then
    select jsonb_build_object(
      'userName',u.uid,
      'walletProtocol',coalesce(a.network,'ERC20'),
      'walletAddress',coalesce(a.address,''),
      'connectedWalletUsdt',b.balance::text,
      'dailyRevenueUsdt',coalesce((select avg(day_total)::numeric(20,6)::text from (select sum(l.amount_usdt) day_total from imo.balance_ledger l where l.user_id=u.id and l.kind='device_daily_reward' group by l.created_at::date) daily_totals),'0.000000'),
      'reward',reward
    ) into account
    from imo.users u join imo.account_balances b on b.user_id=u.id
    left join imo.withdrawal_addresses a on a.user_id=u.id where u.id=d.user_id;
  end if;
  return jsonb_build_object('protocolVersion',1,'deviceId',d.id,'paired',d.user_id is not null,
    'publication',case when d.user_id is not null and pub.version is not null then jsonb_build_object('version',pub.version,'content',pub.content,'publishedAt',pub.published_at) else null end,
    'account',account,'serverTime',now(),'pollAfterSeconds',15);
end $$;

revoke all on table imo.device_reward_state from public,anon,authenticated;
grant select,insert,update,delete on table imo.device_reward_state to service_role;
revoke all on function imo.publication_daily_usdt(jsonb),imo.accrue_online_device_reward(uuid,timestamptz),imo.reset_device_reward_rate() from public,anon,authenticated;
grant execute on function imo.publication_daily_usdt(jsonb),imo.accrue_online_device_reward(uuid,timestamptz) to service_role;
notify pgrst, 'reload schema';
