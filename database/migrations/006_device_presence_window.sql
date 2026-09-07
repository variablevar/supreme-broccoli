create or replace view imo.device_overview as select d.id,d.uid,d.name,d.user_id,d.revoked_at,
  p.version,p.content,p.published_at,r.applied_version,r.last_seen,r.firmware,
  (d.revoked_at is null and r.last_seen>now()-interval '40 seconds') as online
from imo.devices d left join imo.device_publications p on p.device_id=d.id left join imo.device_runtime r on r.device_id=d.id;
notify pgrst, 'reload schema';
