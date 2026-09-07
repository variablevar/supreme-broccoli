import { PostgrestClient } from '@supabase/postgrest-js';
import { hash } from 'bcryptjs';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const baseUrl = process.env.DATABASE_REST_URL ||
  (process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1` : '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Set ADMIN_EMAIL to a valid operator email.');
if (!password || password.length < 16 || password.length > 72) throw new Error('Set ADMIN_PASSWORD to 16-72 characters.');
if (!baseUrl || !key) throw new Error('Set the database URL and SUPABASE_SERVICE_ROLE_KEY.');

const db = new PostgrestClient(baseUrl, {
  schema: 'imo',
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const { error } = await db.from('admin_users').insert({
  email,
  password_hash: await hash(password, 12),
  must_reset_password: true,
});
if (error) throw new Error(`Could not create operator: ${error.message}`);
console.log(`Created ${email}. First login requires a password change and TOTP enrollment.`);
