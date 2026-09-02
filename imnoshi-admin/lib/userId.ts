import { createHash } from 'crypto';

/**
 * Deterministically map a Clerk user ID (e.g. "user_2abc...") to a UUID.
 * MUST stay identical to the main app's lib/userId.ts so user rows match.
 */
export function clerkIdToUuid(clerkId: string): string {
  const hash = createHash('sha256').update(`imnoshi:${clerkId}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
