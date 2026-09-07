create table imo.withdrawal_addresses (
  user_id uuid primary key references imo.users(id),
  network text not null default 'ERC20' check(network='ERC20'),
  address text not null check(address ~ '^0x[0-9a-f]{40}$' and address <> '0x0000000000000000000000000000000000000000'),
  updated_at timestamptz not null default now()
);
create table imo.balance_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references imo.users(id),
  amount_usdt numeric(20,6) not null check(amount_usdt <> 0),
  kind text not null check(kind in ('admin_adjustment','withdrawal_paid')),
  reference_id uuid not null, note text not null, actor_email text not null,
  created_at timestamptz not null default now(), unique(user_id, reference_id)
);
create index on imo.balance_ledger(user_id, created_at desc);
create table imo.withdrawals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references imo.users(id),
  request_key uuid not null, amount numeric(20,6) not null check(amount > 0),
  network text not null check(network='ERC20'), destination text not null,
  status text not null default 'requested' check(status in ('requested','approved','rejected','paid')),
  reason text, reviewed_by text, tx_hash text, created_at timestamptz not null default now(),
  reviewed_at timestamptz, paid_at timestamptz, unique(user_id, request_key), unique(network, tx_hash),
  check((status='paid') = (tx_hash is not null and paid_at is not null))
);
create index on imo.withdrawals(user_id, status);
create function imo.immutable_record() returns trigger language plpgsql as $$
begin raise exception 'Append-only record'; end $$;
create trigger immutable_ledger before update or delete on imo.balance_ledger for each row execute function imo.immutable_record();
create trigger immutable_audit before update or delete on imo.admin_audit_log for each row execute function imo.immutable_record();

create view imo.account_balances as
select u.id as user_id,
  coalesce((select sum(l.amount_usdt) from imo.balance_ledger l where l.user_id=u.id),0)::numeric(20,6) as balance,
  coalesce((select sum(w.amount) from imo.withdrawals w where w.user_id=u.id and w.status in ('requested','approved')),0)::numeric(20,6) as reserved,
  (coalesce((select sum(l.amount_usdt) from imo.balance_ledger l where l.user_id=u.id),0) - coalesce((select sum(w.amount) from imo.withdrawals w where w.user_id=u.id and w.status in ('requested','approved')),0))::numeric(20,6) as available
from imo.users u;

create function imo.assert_amount(p_amount numeric, p_signed boolean default false) returns void language plpgsql as $$
begin
  if p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount=0 or abs(p_amount)>999999999999.999999 or scale(p_amount)>6 or (not p_signed and p_amount<0) then
    raise exception 'Invalid USDT amount' using errcode='22023';
  end if;
end $$;

create function imo.adjust_balance(p_user_id uuid, p_amount numeric, p_reason text, p_actor text, p_key uuid) returns jsonb language plpgsql as $$
declare entry imo.balance_ledger; funds numeric;
begin
  perform imo.assert_amount(p_amount,true);
  if p_key is null or p_reason is null or length(trim(p_reason))<3 or length(p_reason)>280 then raise exception 'A reason and request key are required' using errcode='22023'; end if;
  perform 1 from imo.users where id=p_user_id for update;
  if not found then raise exception 'Customer not found' using errcode='P0002'; end if;
  select * into entry from imo.balance_ledger where user_id=p_user_id and reference_id=p_key;
  if found then
    if entry.amount_usdt<>p_amount or entry.note<>p_reason or entry.kind<>'admin_adjustment' then raise exception 'Request key reused with different data' using errcode='23505'; end if;
    return to_jsonb(entry) || jsonb_build_object('amount_usdt',entry.amount_usdt::text);
  end if;
  select available into funds from imo.account_balances where user_id=p_user_id;
  if funds+p_amount<0 then raise exception 'Adjustment would spend reserved or unavailable funds' using errcode='22023'; end if;
  insert into imo.balance_ledger(user_id,amount_usdt,kind,reference_id,note,actor_email) values(p_user_id,p_amount,'admin_adjustment',p_key,p_reason,p_actor) returning * into entry;
  insert into imo.admin_audit_log(actor_email,action,target_table,target_id,details) values(p_actor,'balance.adjust','balance_ledger',entry.id::text,jsonb_build_object('user_id',p_user_id,'amount',p_amount::text,'reason',p_reason));
  return to_jsonb(entry) || jsonb_build_object('amount_usdt',entry.amount_usdt::text);
end $$;

create function imo.request_withdrawal(p_user_id uuid, p_amount numeric, p_key uuid) returns jsonb language plpgsql as $$
declare w imo.withdrawals; dest imo.withdrawal_addresses; funds numeric;
begin
  perform imo.assert_amount(p_amount);
  if p_key is null then raise exception 'Request key required' using errcode='22023'; end if;
  perform 1 from imo.users where id=p_user_id for update;
  if not found then raise exception 'Customer not found' using errcode='P0002'; end if;
  select * into w from imo.withdrawals where user_id=p_user_id and request_key=p_key;
  if found then
    if w.amount<>p_amount then raise exception 'Request key reused with different amount' using errcode='23505'; end if;
    return to_jsonb(w) || jsonb_build_object('amount',w.amount::text);
  end if;
  select * into dest from imo.withdrawal_addresses where user_id=p_user_id;
  if not found then raise exception 'Save a withdrawal address first' using errcode='22023'; end if;
  select available into funds from imo.account_balances where user_id=p_user_id;
  if funds<p_amount then raise exception 'Insufficient available balance' using errcode='22023'; end if;
  insert into imo.withdrawals(user_id,request_key,amount,network,destination) values(p_user_id,p_key,p_amount,dest.network,dest.address) returning * into w;
  return to_jsonb(w) || jsonb_build_object('amount',w.amount::text);
end $$;

create function imo.decide_withdrawal(p_id uuid, p_decision text, p_reason text, p_actor text) returns jsonb language plpgsql as $$
declare w imo.withdrawals; owner_id uuid;
begin
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision' using errcode='22023'; end if;
  select user_id into owner_id from imo.withdrawals where id=p_id;
  if not found then raise exception 'Withdrawal not found' using errcode='P0002'; end if;
  perform 1 from imo.users where id=owner_id for update;
  select * into w from imo.withdrawals where id=p_id for update;
  if w.status=p_decision then return to_jsonb(w) || jsonb_build_object('amount',w.amount::text); end if;
  if w.status not in ('requested','approved') or (p_decision='approved' and w.status<>'requested') then raise exception 'Withdrawal is already closed' using errcode='22023'; end if;
  if p_decision='rejected' and (p_reason is null or length(trim(p_reason))<3 or length(p_reason)>280) then raise exception 'Rejection reason required' using errcode='22023'; end if;
  update imo.withdrawals set status=p_decision, reason=p_reason, reviewed_by=p_actor, reviewed_at=now() where id=p_id returning * into w;
  insert into imo.admin_audit_log(actor_email,action,target_table,target_id,details) values(p_actor,'withdrawal.'||p_decision,'withdrawals',p_id::text,jsonb_build_object('reason',p_reason));
  return to_jsonb(w) || jsonb_build_object('amount',w.amount::text);
end $$;

create function imo.record_payment(p_id uuid, p_tx_hash text, p_actor text) returns jsonb language plpgsql as $$
declare w imo.withdrawals; owner_id uuid;
begin
  if p_tx_hash is null or p_tx_hash !~ '^0x[0-9a-fA-F]{64}$' or p_tx_hash = '0x'||repeat('0',64) then raise exception 'Invalid Ethereum transaction hash' using errcode='22023'; end if;
  p_tx_hash := lower(p_tx_hash);
  select user_id into owner_id from imo.withdrawals where id=p_id;
  if not found then raise exception 'Withdrawal not found' using errcode='P0002'; end if;
  perform 1 from imo.users where id=owner_id for update;
  select * into w from imo.withdrawals where id=p_id for update;
  if w.status='paid' and w.tx_hash=p_tx_hash then return to_jsonb(w) || jsonb_build_object('amount',w.amount::text); end if;
  if w.status<>'approved' then raise exception 'Approve the withdrawal before recording payment' using errcode='22023'; end if;
  update imo.withdrawals set status='paid',tx_hash=p_tx_hash,paid_at=now(),reviewed_by=p_actor where id=p_id returning * into w;
  insert into imo.balance_ledger(user_id,amount_usdt,kind,reference_id,note,actor_email) values(owner_id,-w.amount,'withdrawal_paid',w.id,'External payment '||p_tx_hash,p_actor);
  insert into imo.admin_audit_log(actor_email,action,target_table,target_id,details) values(p_actor,'withdrawal.paid','withdrawals',p_id::text,jsonb_build_object('tx_hash',p_tx_hash,'amount',w.amount::text,'destination',w.destination));
  return to_jsonb(w) || jsonb_build_object('amount',w.amount::text);
end $$;
