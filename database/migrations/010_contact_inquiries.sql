create table imo.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 2 and 120),
  email text not null check(email = lower(email) and length(email) <= 160),
  subject text not null check(length(subject) between 3 and 160),
  message text not null check(length(message) between 10 and 3000),
  status text not null default 'new' check(status in ('new','in_progress','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on imo.contact_inquiries(status, created_at desc);
create index on imo.contact_inquiries(created_at desc);
alter table imo.contact_inquiries enable row level security;

create function imo.update_contact_inquiry_status(p_id uuid,p_status text,p_actor text) returns imo.contact_inquiries language plpgsql as $$
declare inquiry imo.contact_inquiries;
begin
  if p_status not in ('new','in_progress','resolved') then
    raise exception 'Invalid contact inquiry status' using errcode='22023';
  end if;
  update imo.contact_inquiries set status=p_status,updated_at=now() where id=p_id returning * into inquiry;
  if inquiry.id is null then raise exception 'Contact inquiry not found' using errcode='P0002'; end if;
  insert into imo.admin_audit_log(actor_email,action,target_table,target_id,details)
  values(lower(p_actor),'contact_inquiry.status_changed','contact_inquiries',p_id::text,jsonb_build_object('status',p_status));
  return inquiry;
end $$;

revoke all on table imo.contact_inquiries from public,anon,authenticated;
grant select,insert,update,delete on table imo.contact_inquiries to service_role;
revoke all on function imo.update_contact_inquiry_status(uuid,text,text) from public,anon,authenticated;
grant execute on function imo.update_contact_inquiry_status(uuid,text,text) to service_role;
notify pgrst, 'reload schema';
