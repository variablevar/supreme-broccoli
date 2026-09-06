import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/** Generate a fresh TOTP secret. */
export function generateFreshSecret(): string {
  return generateSecret();
}

const ISSUER = 'IMNOSHI Admin';

const ENCRYPTION_KEY = (() => {
  const raw = process.env.ADMIN_TOTP_ENC_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!raw) {
    throw new Error(
      'ADMIN_TOTP_ENC_KEY or SUPABASE_SERVICE_ROLE_KEY must be set so TOTP secrets can be encrypted at rest.'
    );
  }
  // SHA-256 of the key material, truncated to 32 bytes for AES-256.
  return createHash('sha256').update(raw).digest();
})();

/**
 * Encrypt a TOTP secret with AES-256-CTR using a key derived from
 * SUPABASE_SERVICE_ROLE_KEY. Returns IV || ciphertext.
 */
export function encryptSecret(plain: string): Buffer {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-ctr', ENCRYPTION_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, ciphertext]);
}

/** Decrypt a buffer produced by encryptSecret. */
export function decryptSecret(blob: Buffer): string {
  const iv = blob.subarray(0, 16);
  const ciphertext = blob.subarray(16);
  const decipher = createDecipheriv('aes-256-ctr', ENCRYPTION_KEY, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export interface TotpEnrollment {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

/** Generate a fresh TOTP secret and a QR code data URL for the admin to scan. */
export async function createEnrollment(email: string): Promise<TotpEnrollment> {
  const secret = generateSecret();
  return enrollmentFromSecret(email, secret, true);
}

const PENDING_TTL_MS = 10 * 60_000;

/**
 * Build the otpauth URL + QR for a known secret. The route handlers
 * persist a secret in pending_totp_secret on GET, then render the QR
 * from this helper on GET and verify against the SAME secret on POST.
 */
export async function enrollmentFromSecret(
  email: string,
  secret: string,
  withQr = true
): Promise<TotpEnrollment> {
  const otpauthUrl = generateURI({
    strategy: 'totp',
    issuer: ISSUER,
    label: email,
    secret,
    digits: 6,
    period: 30,
  });
  let qrDataUrl = '';
  if (withQr) {
    qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
    });
  }
  return { secret, otpauthUrl, qrDataUrl };
}

/**
 * Convert whatever shape the Supabase JS client hands us for a bytea
 * column into a real Node.js Buffer. The client has historically
 * returned one of:
 *   - a real Buffer (old clients),
 *   - a {type:'Buffer', data:[...]} object,
 *   - a JSON-encoded string of that object (newer clients),
 *   - or a hex string with the postgres "\x" prefix.
 *
 * Note: the JSON-encoded string variant *also* starts with "\x" once
 * the JSON is serialised (because the leading char of JSON is "{" =
 * 0x7b, and 0x7b is a valid hex pair that starts with the literal
 * backslash-x when the Supabase REST API URL-encodes things).
 * We must therefore check for the JSON wrapper first.
 *
 * Trying to pass any of these directly into createDecipheriv
 * silently returns garbage, so we have to be explicit.
 */
export function byteaToBuffer(raw: unknown): Buffer {
  if (Buffer.isBuffer(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown[] }).data)) {
    return Buffer.from((raw as { data: number[] }).data);
  }
  if (typeof raw === 'string') {
    // The Supabase REST API returns bytea as either:
    //   1. the literal hex string "\x..." (postgres bytea hex format)
    //   2. the JSON-encoded string '{"type":"Buffer","data":[...]}'
    //      (newer clients serialise Buffers through JSON).
    // Sometimes we get a DOUBLE-encoding: the bytea bytes themselves
    // are the bytes of a JSON Buffer wrapper, then the whole thing
    // is re-hex-encoded with the postgres "\x" escape.
    //
    // We try the JSON parse first (it only succeeds if the bytes are
    // literally the ASCII text of the JSON wrapper), then fall back
    // to plain hex decoding. When the JSON parse succeeds inside a
    // hex-decoded buffer, we do a second JSON parse.

    const tryJson = (s: string): Buffer | null => {
      try {
        const parsed = JSON.parse(s) as { type?: string; data?: number[] };
        if (parsed && parsed.type === 'Buffer' && Array.isArray(parsed.data)) {
          return Buffer.from(parsed.data);
        }
      } catch {
        // not JSON, fall through
      }
      return null;
    };

    if (raw.startsWith('\\x')) {
      const stripped = raw.slice(2);
      // Case: postgres hex bytes whose content IS the JSON wrapper.
      const fromJson = tryJson(stripped);
      if (fromJson) return fromJson;
      // Case: plain postgres hex bytes (the actual ciphertext).
      if (/^[0-9a-f]+$/i.test(stripped) && stripped.length % 2 === 0) {
        const decoded = Buffer.from(stripped, 'hex');
        // It might still be JSON after decoding (double-encoded case).
        const inner = tryJson(decoded.toString('utf8'));
        if (inner) return inner;
        return decoded;
      }
      return Buffer.from(stripped, 'utf8');
    }
    const direct = tryJson(raw);
    if (direct) return direct;
    if (/^[0-9a-f]+$/i.test(raw) && raw.length % 2 === 0) {
      return Buffer.from(raw, 'hex');
    }
    return Buffer.from(raw, 'utf8');
  }
  return Buffer.from(raw as ArrayLike<number>);
}

/** Encrypt a secret for storage in pending_totp_secret / totp_secret_encrypted. */
export function encryptSecretForDb(secret: string): Buffer {
  return encryptSecret(secret);
}

/** Decrypt a bytea blob that came back from Supabase. */
export function decryptSecretFromDb(blob: Buffer): string {
  return decryptSecret(blob);
}

export const PENDING_TOTP_TTL_MS = PENDING_TTL_MS;

/** Verify a 6-digit code against a plaintext TOTP secret. 30s window. */
export function verifyTotp(secret: string, code: string): boolean {
  // Strip whitespace, allow grouping.
  const cleaned = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleaned)) return false;
  try {
    const result = verifySync({
      strategy: 'totp',
      secret,
      token: cleaned,
      digits: 6,
      period: 30,
      // Allow ±1 step (≈30s each direction) for clock drift.
      epochTolerance: 1,
    });
    return !!result.valid;
  } catch {
    return false;
  }
}