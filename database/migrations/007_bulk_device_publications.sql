create function imo.publish_device_group(
  p_scope text,
  p_device_ids uuid[],
  p_content jsonb,
  p_actor text
) returns jsonb language plpgsql as $$
declare
  affected integer;
  affected_ids jsonb;
begin
  if p_scope not in ('all','selected','online','offline') then
    raise exception 'Invalid publication target' using errcode='22023';
  end if;
  if p_scope='selected' and coalesce(array_length(p_device_ids,1),0)=0 then
    raise exception 'Select at least one device' using errcode='22023';
  end if;

  with targets as (
    select d.id
    from imo.devices d
    left join imo.device_runtime r on r.device_id=d.id
    where d.revoked_at is null and case p_scope
      when 'all' then true
      when 'selected' then d.id=any(p_device_ids)
      when 'online' then r.last_seen>now()-interval '40 seconds'
      when 'offline' then r.last_seen is null or r.last_seen<=now()-interval '40 seconds'
    end
    order by d.id
    for update of d
  ), published as (
    insert into imo.device_publications(device_id,version,content,published_by)
    select t.id,coalesce(p.version,0)+1,p_content,p_actor
    from targets t left join imo.device_publications p on p.device_id=t.id
    on conflict(device_id) do update set
      version=imo.device_publications.version+1,
      content=excluded.content,
      published_by=excluded.published_by,
      published_at=now()
    returning device_id,version
  ), audited as (
    insert into imo.admin_audit_log(actor_email,action,target_table,target_id,details)
    select p_actor,'device.publish.bulk','devices',p.device_id::text,
      jsonb_build_object('version',p.version,'scope',p_scope,'content',p_content)
    from published p
    returning target_id
  )
  select count(*),coalesce(jsonb_agg(target_id order by target_id),'[]'::jsonb)
  into affected,affected_ids from audited;

  return jsonb_build_object('publishedCount',affected,'deviceIds',affected_ids);
end $$;

revoke all on function imo.publish_device_group(text,uuid[],jsonb,text) from public,anon,authenticated;
grant execute on function imo.publish_device_group(text,uuid[],jsonb,text) to service_role;

notify pgrst, 'reload schema';
