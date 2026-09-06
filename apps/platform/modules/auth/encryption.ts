import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
function key() {
  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (!raw || !/^[a-f0-9]{64}$/i.test(raw)) throw new Error('TOTP_ENCRYPTION_KEY must be 32 random bytes encoded as hex');
  return Buffer.from(raw, 'hex');
}
export function seal(plain: string): Buffer {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}
export function open(blob: Buffer): string {
  if (blob.length < 29) throw new Error('Invalid encrypted secret');
  const decipher = createDecipheriv('aes-256-gcm', key(), blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]).toString('utf8');
}
