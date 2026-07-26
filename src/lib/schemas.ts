// Ported from web src/lib/schemas.ts — same validation contract as the web app.
import { z } from "zod";

export const signUpSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const isoDateOrNull = z
  .string()
  .datetime({ message: "Must be a valid ISO 8601 timestamp" })
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

export const createInviteSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  theme: z.string().min(1, "Theme is required").max(64, "Invalid theme"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(500, "Max 500 characters"),
  revealType: z.enum(["tap", "countdown"]),
  countdownDate: isoDateOrNull,
  expiresAt: isoDateOrNull,
});

export const inviteQuestionsSchema = z
  .array(
    z.object({
      text: z.string().max(200),
      requireAnswer: z.boolean(),
      yesLabel: z.string().max(40),
      noLabel: z.string().max(40),
      enableDodge: z.boolean(),
    })
  )
  .max(10, "At most 10 questions per invite");

export const magicLinkSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
export type CreateInviteValues = z.infer<typeof createInviteSchema>;
