create table imo.registration_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);
create index on imo.registration_applications(status,created_at);

create function imo.submit_registration_application(p_email text,p_password_hash text) returns jsonb language plpgsql as $$
declare application imo.registration_applications;
begin
  if exists(select 1 from imo.web_users where email=lower(p_email)) then
    raise exception 'An account already exists' using errcode='23505';
  end if;
  insert into imo.registration_applications(email,password_hash)
  values(lower(p_email),p_password_hash)
  on conflict(email) do update set
    password_hash=excluded.password_hash,status='pending',reviewed_by=null,reviewed_at=null,rejection_reason=null,created_at=now()
  where imo.registration_applications.status='rejected'
  returning * into application;
  if not found then raise exception 'An application is already awaiting review' using errcode='23505'; end if;
  return jsonb_build_object('id',application.id,'email',application.email,'status',application.status);
end $$;

create function imo.decide_registration_application(p_id uuid,p_decision text,p_actor text,p_reason text default null) returns jsonb language plpgsql as $$
declare application imo.registration_applications; account jsonb;
begin
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision' using errcode='22023'; end if;
  select * into application from imo.registration_applications where id=p_id for update;
  if not found then raise exception 'Application not found' using errcode='P0002'; end if;
  if application.status<> 'pending' then raise exception 'Application was already reviewed' using errcode='23505'; end if;
  if p_decision='approved' then
    account:=imo.register_customer(application.email,application.password_hash,'IMO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));
  elsif coalesce(length(trim(p_reason)),0)<3 then
    raise exception 'A rejection reason is required' using errcode='22023';
  end if;
  update imo.registration_applications set status=p_decision,reviewed_by=p_actor,reviewed_at=now(),rejection_reason=case when p_decision='rejected' then trim(p_reason) end where id=p_id;
  insert into imo.admin_audit_log(actor_email,action,target_table,target_id,details)
  values(p_actor,'registration.'||p_decision,'registration_applications',p_id::text,jsonb_build_object('email',application.email));
  return jsonb_build_object('id',p_id,'status',p_decision,'account',account);
end $$;

create or replace function imo.admin_overview() returns jsonb language sql stable as $$
select jsonb_build_object(
  'users',coalesce((select jsonb_agg(to_jsonb(u)||jsonb_build_object('balance',b.balance::text,'available',b.available::text,'reserved',b.reserved::text) order by u.created_at desc) from (select id,email,uid,created_at from imo.users order by created_at desc limit 200) u join imo.account_balances b on b.user_id=u.id),'[]'::jsonb),
  'applications',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'email',a.email,'status',a.status,'created_at',a.created_at,'reviewed_by',a.reviewed_by,'reviewed_at',a.reviewed_at,'rejection_reason',a.rejection_reason) order by a.created_at desc) from (select * from imo.registration_applications order by created_at desc limit 200) a),'[]'::jsonb),
  'devices',coalesce((select jsonb_agg(to_jsonb(d) order by d.uid) from (select * from imo.device_overview order by uid limit 200) d),'[]'::jsonb),
  'withdrawals',coalesce((select jsonb_agg(to_jsonb(w)||jsonb_build_object('amount',w.amount::text,'email',u.email) order by w.created_at desc) from (select * from imo.withdrawals order by created_at desc limit 200) w join imo.users u on u.id=w.user_id),'[]'::jsonb),
  'audit',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select * from imo.admin_audit_log order by created_at desc limit 100) a),'[]'::jsonb),
  'inquiries',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from (select * from imo.purchase_inquiries order by created_at desc limit 100) i),'[]'::jsonb)
);
$$;
alter table imo.registration_applications enable row level security;
revoke all on imo.registration_applications from public,anon,authenticated;
revoke all on function imo.submit_registration_application(text,text) from public,anon,authenticated;
revoke all on function imo.decide_registration_application(uuid,text,text,text) from public,anon,authenticated;
grant select,insert,update,delete on imo.registration_applications to service_role;
grant execute on function imo.submit_registration_application(text,text),imo.decide_registration_application(uuid,text,text,text) to service_role;
notify pgrst, 'reload schema';
