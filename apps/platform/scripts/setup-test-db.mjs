import { Pool } from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { hash } from 'bcryptjs';
import { testDatabaseUrl } from './test-environment.mjs';
const db=new Pool({connectionString:testDatabaseUrl});
try {
  await db.query("do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end $$;");
  // This script has no environment override and only targets the disposable localhost database.
  await db.query('drop schema if exists imo cascade');
  const dir=new URL('../../../database/migrations/',import.meta.url);
  for(const name of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort())await db.query(await readFile(new URL(name,dir),'utf8'));
  await db.query('insert into imo.admin_users(email,password_hash) values($1,$2)',['operator@example.test',await hash('Integration-test-password!',12)]);
  console.log('Disposable localhost database initialized. Operator requires TOTP setup.');
} finally {await db.end();}
