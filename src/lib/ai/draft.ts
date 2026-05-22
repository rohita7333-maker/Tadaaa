import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { DRAFT_SYSTEM, buildDraftUserMsg } from "./prompts";

const THEME_IDS = [
  "warm-embrace",
  "golden-hour",
  "midnight-romance",
  "garden-party",
  "velvet-night",
  "cotton-candy",
  "royal-plum",
  "cherry-blossom",
  "ocean-breeze",
  "neon-party",
  "farewell-skies",
  "sunset-proposal",
] as const;

const DraftSchema = z.object({
  title: z.string().min(1).max(60),
  message: z.string().min(1).max(280),
  questions: z
    .array(
      z.object({
        text: z.string().min(1).max(80),
        yesLabel: z.string().min(1).max(20),
        noLabel: z.string().min(1).max(20),
      })
    )
    .min(1)
    .max(5),
  themeId: z.enum(THEME_IDS),
});

export type Draft = z.infer<typeof DraftSchema>;

export function parseDraftOutput(raw: string): Draft {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("invalid_json");
  }
  if (typeof json === "object" && json !== null && "error" in json) {
    throw new Error(`refused:${(json as { error: string }).error}`);
  }
  return DraftSchema.parse(json);
}

export async function draftInvite(input: {
  recipient: string;
  occasion: string;
  tone: string;
  details?: string;
}) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: DRAFT_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildDraftUserMsg(input) }],
  });
  const text = msg.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no_text_block");
  return {
    draft: parseDraftOutput(text.text),
    tokensIn: msg.usage.input_tokens,
    tokensOut: msg.usage.output_tokens,
  };
}
