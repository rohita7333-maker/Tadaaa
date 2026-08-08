import { z } from "zod";

// Curated list of common disposable/temp-mail domains. Not exhaustive — this
// blocks the obvious throwaway providers at signup without maintaining an
// external service dependency. Exact-match against the domain only (never a
// substring check) so a legitimate domain like "notmailinator.com" isn't
// caught by accident.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "fakeinbox.com",
  "sharklasers.com",
  "maildrop.cc",
  "mintemail.com",
  "mailnesia.com",
  "dispostable.com",
  "guerrillamail.info",
  "grr.la",
  "spam4.me",
  "moakt.com",
  "mohmal.com",
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").at(-1);
  return !!domain && DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

export const signUpSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .refine((email) => !isDisposableEmail(email), {
      message: "Disposable email addresses aren't supported. Please use a permanent address.",
    }),
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
  revealType: z.enum(["tap", "countdown", "scroll_story"]),
  countdownDate: isoDateOrNull,
  expiresAt: isoDateOrNull,
}).refine(
  (data) =>
    (data.revealType !== "countdown" && data.revealType !== "scroll_story") ||
    Boolean(data.countdownDate),
  {
    message: "A reveal date is required for countdown and scroll story reveals",
    path: ["countdownDate"],
  }
);

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

// Scroll Story timeline plaques ("The plan" scene). Each event renders one
// gold-cream plaque. Optional detail + Google Maps link. Capped at 4 so the
// scroll stays tight. `mapsQuery` stays camelCase in the JSON payload — it is
// stored verbatim inside the invites.events jsonb column.
export const eventsSchema = z
  .array(
    z.object({
      label: z.string().min(1).max(30),
      title: z.string().min(1).max(80),
      detail: z.string().max(120).optional(),
      mapsQuery: z.string().max(120).optional(),
    })
  )
  .max(4, "At most 4 events per scroll story");

export const magicLinkSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const giftCheckoutSchema = z.object({
  mode: z.literal("gift"),
  gift_recipient_email: z.string().email("Invalid recipient email"),
  gift_message: z.string().max(500).optional(),
  gift_sender_name: z.string().max(100).optional(),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
export type CreateInviteValues = z.infer<typeof createInviteSchema>;
export type GiftCheckoutValues = z.infer<typeof giftCheckoutSchema>;
export type StoryEventInput = z.infer<typeof eventsSchema>[number];
