#!/usr/bin/env node
/**
 * bootstrap-admin.mjs -- one-shot script to make the admin app
 * loginnable against an existing Supabase project.
 *
 * Inserts (or upserts) the default admin accounts so the login
 * flow has rows to compare passwords against. Idempotent.
 *
 * Usage:
 *   pnpm bootstrap
 *  or:
 *   node scripts/bootstrap-admin.mjs
 *
 * Reads env from imnoshi-admin/.env.local then .env (no dotenv
 * dependency required). Required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   ADMIN_EMAILS    comma-separated override; defaults to
 *                   escanor@imnoshi.com,var@imnoshi.com
 *   ADMIN_PASSWORD  override the shared initial password;
 *                   defaults to 'Imnoshi@2026'
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Minimal .env loader (no dependency).
const __dirname = dirname(fileURLToPath(import.meta.url));
const adminDir = resolve(__dirname, '..');
for (const f of ['.env.local', '.env']) {
  const file = resolve(adminDir, f);
  if (!existsSync(file)) continue;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (loaded from .env.local / .env).');
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD || 'Imnoshi@2026';
const emailList = (process.env.ADMIN_EMAILS ?? 'escanor@imnoshi.com,var@imnoshi.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const passwordHash = bcrypt.hashSync(password, 10);
console.log(`Seeding ${emailList.length} admin(s) with shared initial password '${password}'.`);

for (const email of emailList) {
  const { data, error } = await supabase
    .from('admin_users')
    .upsert(
      { email, password_hash: passwordHash, must_reset_password: true },
      { onConflict: 'email' }
    )
    .select('id, email, must_reset_password, totp_enrolled')
    .single();
  if (error) {
    console.error(`  x  ${email}: ${error.message}`);
    continue;
  }
  console.log(`  ok ${email}  (id=${data.id}, reset=${data.must_reset_password}, totp=${data.totp_enrolled})`);
}

console.log('');
console.log('Done. Visit http://localhost:3001/login and sign in.');
console.log("You'll be redirected to /login/setup to set a new password and enrol TOTP.");
