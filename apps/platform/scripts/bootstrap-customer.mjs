#!/usr/bin/env node
/**
 * bootstrap-customer.mjs -- one-shot script to make the customer
 * app loginnable after the wipe migration.
 *
 * Idempotent. Reads .env.local then .env from imnoshi-web/ (no
 * dotenv dep). Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env:
 *   CUSTOMER_EMAIL      default: customer@imnoshi.com
 *   CUSTOMER_PASSWORD   default: Customer@2026!
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(__dirname, '..');
for (const f of ['.env.local', '.env']) {
  const file = resolve(webDir, f);
  if (!existsSync(file)) continue;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (loaded from .env.local / .env).');
  process.exit(1);
}

const email = (process.env.CUSTOMER_EMAIL || 'customer@imnoshi.com').toLowerCase();
const password = process.env.CUSTOMER_PASSWORD || 'Customer@2026!';

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const passwordHash = bcrypt.hashSync(password, 10);
console.log(`Seeding customer ${email} with password '${password}' (must_reset=false).`);

const { data, error } = await supabase
  .from('web_users')
  .upsert(
    {
      email,
      password_hash: passwordHash,
      must_reset_password: false,
      totp_enrolled: false,
      failed_attempts: 0,
      locked_until: null,
    },
    { onConflict: 'email' }
  )
  .select('id, email, must_reset_password, totp_enrolled')
  .single();
if (error) {
  console.error(`  x  ${email}: ${error.message}`);
  process.exit(1);
}
console.log(`  ok ${email}  (id=${data.id}, reset=${data.must_reset_password}, totp=${data.totp_enrolled})`);

// Make sure the public.users app row exists. We call the same
// helper the dashboard layout uses.
const { randomUUID } = await import('node:crypto');
const { data: existingUser } = await supabase
  .from('users')
  .select('id, uid')
  .eq('email', email)
  .maybeSingle();
if (!existingUser) {
  const { error: uErr } = await supabase.from('users').insert({
    id: randomUUID(),
    uid: `IMN-LIVE-0001`,
    email,
  });
  if (uErr) {
    console.error(`  x  could not create users row: ${uErr.message}`);
    process.exit(1);
  }
  console.log(`  ok users row created with uid IMN-LIVE-0001`);
} else {
  console.log(`  ok users row already exists (uid=${existingUser.uid})`);
}

console.log('');
console.log('Done. Visit http://localhost:3000/login and sign in.');
console.log(`  email:    ${email}`);
console.log(`  password: ${password}`);
