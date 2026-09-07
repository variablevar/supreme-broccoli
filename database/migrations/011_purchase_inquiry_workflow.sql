alter table imo.purchase_inquiries
  add column updated_at timestamptz not null default now();
update imo.purchase_inquiries set email=lower(trim(email)),phone=coalesce(phone,'') where true;
alter table imo.purchase_inquiries
  add constraint purchase_inquiry_name_length check(length(name) between 2 and 120),
  add constraint purchase_inquiry_email_format check(email=lower(email) and length(email)<=160),
  add constraint purchase_inquiry_phone_length check(length(phone)<=80),
  add constraint purchase_inquiry_quantity_range check(quantity between 1 and 20),
  add constraint purchase_inquiry_status check(status in ('new','contacted','closed'));

create index on imo.purchase_inquiries(status,created_at desc);

create function imo.update_purchase_inquiry_status(p_id uuid,p_status text,p_actor text) returns imo.purchase_inquiries language plpgsql as $$
declare inquiry imo.purchase_inquiries;
begin
  if p_status not in ('new','contacted','closed') then
    raise exception 'Invalid purchase inquiry status' using errcode='22023';
  end if;
  update imo.purchase_inquiries set status=p_status,updated_at=now() where id=p_id returning * into inquiry;
  if inquiry.id is null then raise exception 'Purchase inquiry not found' using errcode='P0002'; end if;
  insert into imo.admin_audit_log(actor_email,action,target_table,target_id,details)
  values(lower(p_actor),'purchase_inquiry.status_changed','purchase_inquiries',p_id::text,jsonb_build_object('status',p_status));
  return inquiry;
end $$;

revoke all on function imo.update_purchase_inquiry_status(uuid,text,text) from public,anon,authenticated;
grant execute on function imo.update_purchase_inquiry_status(uuid,text,text) to service_role;
notify pgrst, 'reload schema';
