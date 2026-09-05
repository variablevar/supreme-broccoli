import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ISSUER = 'IMNOSHI';

const ENCRYPTION_KEY = (() => {
  const raw = process.env.CUSTOMER_TOTP_ENC_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!raw) {
    throw new Error(
      'CUSTOMER_TOTP_ENC_KEY or SUPABASE_SERVICE_ROLE_KEY must be set so TOTP secrets can be encrypted at rest.'
    );
  }
  return createHash('sha256').update(raw).digest();
})();

/** Generate a fresh TOTP secret. */
export function generateFreshSecret(): string {
  return generateSecret();
}

/** Encrypt a TOTP secret (AES-256-CTR). Returns IV || ciphertext. */
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

const PENDING_TTL_MS = 10 * 60_000;
export const PENDING_TOTP_TTL_MS = PENDING_TTL_MS;

/**
 * Convert whatever shape the Supabase JS client hands us for a bytea
 * column into a real Node.js Buffer. The client has historically
 * returned one of:
 *   - a real Buffer (old clients),
 *   - a {type:'Buffer', data:[...]} object,
 *   - a JSON-encoded string of that object (newer clients),
 *   - or a hex string with the postgres "\x" prefix.
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
    // Sometimes we get a DOUBLE-encoding: the bytea bytes are the
    // bytes of a JSON Buffer wrapper, then hex-encoded with the
    // postgres "\x" escape.
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
      const fromJson = tryJson(stripped);
      if (fromJson) return fromJson;
      if (/^[0-9a-f]+$/i.test(stripped) && stripped.length % 2 === 0) {
        const decoded = Buffer.from(stripped, 'hex');
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

/** Build the otpauth URL + QR for a known secret. */
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

/** Verify a 6-digit code against a plaintext TOTP secret. ±1 step tolerance. */
export function verifyTotp(secret: string, code: string): boolean {
  const cleaned = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleaned)) return false;
  try {
    const result = verifySync({
      strategy: 'totp',
      secret,
      token: cleaned,
      digits: 6,
      period: 30,
      epochTolerance: 1,
    });
    return !!result.valid;
  } catch {
    return false;
  }
}