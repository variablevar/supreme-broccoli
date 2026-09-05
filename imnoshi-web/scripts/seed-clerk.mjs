/**
 * seed-clerk.mjs
 *
 * Creates demo Clerk users to match the rows inserted by seed.sql.
 * Two kinds:
 *  - 5 customer accounts (demo1..demo5@example.com)
 *  - 4 admin accounts (2 full-admin, 2 view-only)
 *
 * Run with:
 *   node scripts/seed-clerk.mjs
 *
 * Required envs:
 *   CLERK_SECRET_KEY          -- Backend API key (sk_test_...)
 *   CLERK_INVITE_REDIRECT_URL -- Where the invite points after click
 *                                (default http://localhost:3000)
 *
 * Real email delivery is not done by this script -- by default it
 * creates Clerk users in 'sign-up mode' (no email) so you can sign in
 * with the email + a chosen password. Override CLERK_SEND_INVITES=1
 * to send real invite emails instead.
 */

import { readFileSync } from 'node:fs';

const SECRET = process.env.CLERK_SECRET_KEY;
if (!SECRET) {
  console.error('CLERK_SECRET_KEY is required');
  process.exit(1);
}

const REDIRECT = process.env.CLERK_INVITE_REDIRECT_URL || 'http://localhost:3000';
const SEND_INVITES = process.env.CLERK_SEND_INVITES === '1';

const ACCOUNTS = [
  // customers
  { email: 'demo1@example.com', password: 'demo-pass-1111', firstName: 'Demo', lastName: 'One'   },
  { email: 'demo2@example.com', password: 'demo-pass-2222', firstName: 'Demo', lastName: 'Two'   },
  { email: 'demo3@example.com', password: 'demo-pass-3333', firstName: 'Demo', lastName: 'Three' },
  { email: 'demo4@example.com', password: 'demo-pass-4444', firstName: 'Demo', lastName: 'Four'  },
  { email: 'demo5@example.com', password: 'demo-pass-5555', firstName: 'Demo', lastName: 'Five'  },
  // full admins
  { email: 'escanor@imnoshi.com', password: 'demo-admin-1', firstName: 'Escanor' },
  { email: 'var@imnoshi.com',     password: 'demo-admin-2', firstName: 'Var' },
  // view-only admins (also add them manually in the admin app's
  // public.view_only_admins table after seeding -- seed.sql already
  // adds viewer1/2@imnoshi.com there as samples).
  { email: 'viewer1@imnoshi.com', password: 'demo-view-1', firstName: 'Viewer1' },
  { email: 'viewer2@imnoshi.com', password: 'demo-view-2', firstName: 'Viewer2' },
];

async function api(path, init = {}) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

async function createUser({ email, password, firstName, lastName }) {
  // Look up existing users first to make this idempotent.
  const found = await api(`/users?email_address=${encodeURIComponent(email)}`);
  if (found && found.length > 0) {
    console.log(`- exists: ${email}`);
    return found[0];
  }
  const body = {
    email_address: [email],
    first_name: firstName,
    last_name: lastName ?? '',
  };
  if (!SEND_INVITES) {
    body.password = password;
  } else {
    body.skip_password_requirement = false;
  }
  const created = await api('/users', { method: 'POST', body: JSON.stringify(body) });
  console.log(`- created: ${email}`);
  return created;
}

async function invite(email) {
  await api(`/users/${encodeURIComponent(email)}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ redirect_url: REDIRECT }),
  });
  console.log(`  invite -> ${email}`);
}

(async () => {
  console.log(`Seeding Clerk users (${SEND_INVITES ? 'invite mode' : 'password mode'})...`);
  for (const acc of ACCOUNTS) {
    try {
      const u = await createUser(acc);
      if (SEND_INVITES) await invite(acc.email);
      console.log(`  ok   id=${u.id}`);
    } catch (err) {
      console.error(`  FAIL ${acc.email}: ${err.message}`);
    }
  }
  console.log('Done.');
})();
