import { z } from "zod";
export const amount = z
  .string()
  .regex(
    /^(0|[1-9]\d{0,11})(\.\d{1,6})?$/,
    "Use a decimal USDT amount with up to 6 decimal places",
  )
  .refine((v) => /[1-9]/.test(v), "Amount must be positive");
export const adjustment = z
  .string()
  .regex(/^-?(0|[1-9]\d{0,11})(\.\d{1,6})?$/)
  .refine((v) => /[1-9]/.test(v), "Amount must not be zero");
export const address = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Enter an Ethereum public address")
  .refine(
    (v) => !/^0x0{40}$/.test(v),
    "Zero address is not a withdrawal address",
  )
  .transform((v) => v.toLowerCase());
export const txHash = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]{64}$/, "Enter a transaction hash")
  .refine((v) => !/^0x0{64}$/.test(v))
  .transform((v) => v.toLowerCase());
export const withdrawalInput = z
  .object({ amount, requestKey: z.string().uuid() })
  .strict();
export const addressInput = z
  .object({ address, network: z.literal("ERC20") })
  .strict();
export const adjustmentInput = z
  .object({
    userId: z.string().uuid(),
    amount: adjustment,
    reason: z.string().trim().min(3).max(280),
    requestKey: z.string().uuid(),
  })
  .strict();
export const decisionInput = z
  .object({
    withdrawalId: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().trim().max(280).optional(),
  })
  .strict();
export const paymentInput = z
  .object({ withdrawalId: z.string().uuid(), txHash })
  .strict();
