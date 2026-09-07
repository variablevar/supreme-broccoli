import { z } from "zod";
const ascii = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^[\x20-\x7E]*$/, "Device text currently supports printable ASCII");
const publishedAmount = z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,6})?$/);
const metric = z.string().regex(/^(0|[1-9]\d{0,7})(\.\d{1,3})?$/);
export const displayContent = z
  .object({
    title: ascii(32).min(1),
    message: ascii(120),
    currency: z.enum(["BTC", "ETH", "SOL", "DOGE", "LTC", "XMR", "PEARL"]),
    isStaking: z.boolean(),
    rate: metric,
    dailyUsdt: publishedAmount,
    downloadMbps: metric,
    uploadMbps: metric,
    watts: metric,
    energyTodayWh: metric,
  })
  .strict();
export const publishInput = z
  .object({
    content: displayContent,
    expectedVersion: z.number().int().min(0).max(2147483646),
  })
  .strict();
export const bulkPublishInput = z
  .object({
    content: displayContent,
    target: z.enum(["all", "selected", "online", "offline"]),
    deviceIds: z.array(z.string().uuid()).max(200).default([]),
  })
  .strict()
  .refine(
    (value) => value.target !== "selected" || value.deviceIds.length > 0,
    {
      message: "Select at least one device",
      path: ["deviceIds"],
    },
  );
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
