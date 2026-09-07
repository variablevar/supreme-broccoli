import { z } from "zod";
const ascii = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^[\x20-\x7E]*$/, "Device text currently supports printable ASCII");
const publishedAmount = z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,6})?$/);
export const displayContent = z
  .object({
    title: ascii(32).min(1),
    message: ascii(120),
    activity: ascii(24),
    rate: ascii(24),
    dailyUsdt: publishedAmount,
    totalUsdt: publishedAmount,
  })
  .strict();
export const publishInput = z
  .object({
    content: displayContent,
    expectedVersion: z.number().int().min(0).max(2147483646),
  })
  .strict();
export const provisionInput = z
  .object({ name: z.string().trim().min(2).max(80) })
  .strict();
export const pairingInput = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-HJ-NP-Z2-9]{6}$/),
  })
  .strict();
export const syncInput = z
  .object({
    protocolVersion: z.literal(1),
    firmware: ascii(40).min(1),
    uptimeSeconds: z.number().int().min(0).max(4294967295),
    wifiRssi: z.number().int().min(-120).max(0),
    appliedVersion: z.number().int().min(0).max(2147483647),
  })
  .strict();
