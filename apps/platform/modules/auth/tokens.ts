import { createHash, randomBytes } from 'node:crypto';
export type Audience = 'customer' | 'admin';
export type Stage = 'reset' | 'totp' | 'done';
export function newToken() { return randomBytes(32).toString('base64url'); }
export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function validToken(token: string | undefined): token is string { return !!token && /^[A-Za-z0-9_-]{43}$/.test(token); }
export function sessionValid(row: { audience: string; stage: string; expires_at: string } | null, audience: Audience, now = Date.now()) {
  return !!row && row.audience === audience && ['reset', 'totp', 'done'].includes(row.stage) && Number.isFinite(Date.parse(row.expires_at)) && Date.parse(row.expires_at) > now;
}
export function sameOrigin(origin: string | null, expected: string, site: string | null) {
  if (site === 'cross-site') return false;
  return origin === null || origin === expected;
}
