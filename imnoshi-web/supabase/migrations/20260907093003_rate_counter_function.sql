-- Stored function used by the device telemetry/poll endpoint to
-- bump a daily counter atomically (without a race).
create or replace function public.increment_rate_counter(p_date date, p_scope text)
returns int language plpgsql as $$
declare
  new_count int;
begin
  insert into public.rate_counters (bucket_date, scope, count)
    values (p_date, p_scope, 1)
    on conflict (bucket_date, scope)
    do update set count = public.rate_counters.count + 1
    returning count into new_count;
  return new_count;
end;
$$;

-- Allow service-role to invoke this (RPC executes as definer).
grant execute on function public.increment_rate_counter(date, text) to service_role;
