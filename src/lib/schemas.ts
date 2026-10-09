import { z } from "zod";

export const registrationSchema = z.object({
  fullName: z.string().trim().min(3).max(100),
  phone: z.string().trim().min(7).max(24),
  universityId: z.string().trim().min(3).max(40),
  hackerAlias: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[\w.-]+$/, "Use letters, numbers, dot, dash, or underscore"),
});
export const flagSchema = z.object({ flag: z.string().trim().min(10).max(80) });
export const interactionSchema = z.object({
  action: z.string().max(30),
  value: z.string().max(300).optional(),
});
export const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export const offlineClaimSchema = registrationSchema
  .omit({ hackerAlias: true })
  .extend({ offlineParticipantId: z.string().regex(/^OFF-[A-Z0-9]{6}$/) });
