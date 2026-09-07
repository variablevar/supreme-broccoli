-- Run as the database owner. Supabase already has these roles; test setup creates them.
revoke all on schema imo from public, anon, authenticated;
revoke all on all tables in schema imo from public, anon, authenticated;
revoke all on all functions in schema imo from public, anon, authenticated;
grant usage on schema imo to service_role;
grant select,insert,update,delete on all tables in schema imo to service_role;
grant execute on all functions in schema imo to service_role;
-- Append-only triggers also apply to privileged backend writes.
-- RLS closes access if future grants accidentally expose tables to browser roles.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='imo' loop
    execute format('alter table imo.%I enable row level security',t.tablename);
  end loop;
end $$;
alter default privileges in schema imo revoke execute on functions from public;
notify pgrst, 'reload schema';
