create table imo.login_security_events (
  id uuid primary key default gen_random_uuid(),
  audience text not null check(audience in ('customer','admin')),
  attempted_email text not null check(length(attempted_email)<=254),
  outcome text not null check(outcome in ('invalid_request','unknown_email','bad_password','locked','rate_limited','approval_required','invalid_totp')),
  ip_address text check(length(ip_address)<=80),
  country text check(length(country)<=80),
  region text check(length(region)<=120),
  user_agent text check(length(user_agent)<=500),
  created_at timestamptz not null default now()
);
create index on imo.login_security_events(created_at desc);
create index on imo.login_security_events(attempted_email,created_at desc);
alter table imo.login_security_events enable row level security;
create trigger immutable_login_security before update or delete on imo.login_security_events for each row execute function imo.immutable_record();

alter table imo.registration_applications add constraint registration_email_domain
  check(email ~ '^[^@[:space:]]+@imnoshi\.com$') not valid;
create function imo.record_login_security_event(p_audience text,p_email text,p_outcome text,p_ip text,p_country text,p_region text,p_user_agent text) returns void language plpgsql as $$
begin
  if p_audience not in ('customer','admin') or p_outcome not in ('invalid_request','unknown_email','bad_password','locked','rate_limited','approval_required','invalid_totp') then
    raise exception 'Invalid security event' using errcode='22023';
  end if;
  insert into imo.login_security_events(audience,attempted_email,outcome,ip_address,country,region,user_agent)
  values(p_audience,left(coalesce(lower(trim(p_email)),''),254),p_outcome,left(p_ip,80),left(p_country,80),left(p_region,120),left(p_user_agent,500));
end $$;

create or replace function imo.admin_overview() returns jsonb language sql stable as $$
select jsonb_build_object(
  'users',coalesce((select jsonb_agg(to_jsonb(u)||jsonb_build_object('balance',b.balance::text,'available',b.available::text,'reserved',b.reserved::text) order by u.created_at desc) from (select id,email,uid,created_at from imo.users order by created_at desc limit 200) u join imo.account_balances b on b.user_id=u.id),'[]'::jsonb),
  'applications',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'email',a.email,'status',a.status,'created_at',a.created_at,'reviewed_by',a.reviewed_by,'reviewed_at',a.reviewed_at,'rejection_reason',a.rejection_reason) order by a.created_at desc) from (select * from imo.registration_applications order by created_at desc limit 200) a),'[]'::jsonb),
  'devices',coalesce((select jsonb_agg(to_jsonb(d) order by d.uid) from (select * from imo.device_overview order by uid limit 200) d),'[]'::jsonb),
  'withdrawals',coalesce((select jsonb_agg(to_jsonb(w)||jsonb_build_object('amount',w.amount::text,'email',u.email) order by w.created_at desc) from (select * from imo.withdrawals order by created_at desc limit 200) w join imo.users u on u.id=w.user_id),'[]'::jsonb),
  'audit',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select * from imo.admin_audit_log order by created_at desc limit 100) a),'[]'::jsonb),
  'login_security',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (select * from imo.login_security_events order by created_at desc limit 200) e),'[]'::jsonb),
  'inquiries',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from (select * from imo.purchase_inquiries order by created_at desc limit 100) i),'[]'::jsonb)
);
$$;

revoke all on table imo.login_security_events from public,anon,authenticated;
grant select,insert on table imo.login_security_events to service_role;
revoke all on function imo.record_login_security_event(text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function imo.record_login_security_event(text,text,text,text,text,text,text) to service_role;
notify pgrst, 'reload schema';
