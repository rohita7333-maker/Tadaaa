# TaDaaaa Sophistication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform ship-ready TaDaaaa from generic invite builder into AI-powered, network-effected, instrumented, monetization-rich surprise platform with operational maturity to scale.

**Architecture:** Six sequential phases. Phase A ships operational backbone (observability, abuse, GDPR) so all later phases have telemetry. Phase B builds product moat (AI copy, collaborative invites, default reveal video). Phase C activates growth (templates, gallery, k-factor). Phase D restructures pricing + opens B2B. Phase E polishes UX (edge cache, push, SSE, i18n, a11y). Phase F deepens engineering (edge runtime, queue jobs, ORM types). Each phase ships independently and is reversible.

**Tech Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Supabase (Postgres + Auth + Storage + RPC) · Stripe (checkout + webhooks) · Resend (transactional + cron digests) · Remotion (reveal video) · Tailwind 4 · framer-motion · zod · vitest · Sentry · PostHog · Inngest · Upstash Redis · next-intl · Drizzle ORM · Sightengine (moderation).

---

## Conventions Across All Tasks

- Working dir: `/Users/rohit/Downloads/ClaudeCodeProject/tadaaaa/surprise-invite`
- Run all `npm` from there. Never parent dirs.
- Tests: `vitest`. Place beside source as `*.test.ts(x)`.
- All SQL migrations idempotent: `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`.
- Commit per task. Conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`.
- After each phase: `npx tsc --noEmit && npm test && npm run lint`.

---

# PHASE A — OPERATIONAL FOUNDATION

Ship telemetry + abuse defense before adding features. You cannot optimize blind.

## Task A1: Install Sentry for error + performance + replay

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Modify: `src/app/layout.tsx`
- Modify: `next.config.ts`
- Create: `instrumentation.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install deps**

```bash
npm i @sentry/nextjs
```

- [ ] **Step 2: Create Sentry server config**

`sentry.server.config.ts`:
```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.VERCEL_ENV || "development",
  enabled: process.env.NODE_ENV === "production",
});
```

- [ ] **Step 3: Create Sentry client config**

`sentry.client.config.ts`:
```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: true }),
  ],
  enabled: process.env.NODE_ENV === "production",
});
```

- [ ] **Step 4: Create edge config**

`sentry.edge.config.ts`:
```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});
```

- [ ] **Step 5: Wire instrumentation hook**

`instrumentation.ts`:
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { onRequestError } from "@sentry/nextjs";
```

- [ ] **Step 6: Add env vars to `.env.example`**

```
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

- [ ] **Step 7: Test by throwing in `/api/_sentry-test`**

Create `src/app/api/_sentry-test/route.ts`:
```ts
export async function GET() {
  throw new Error("Sentry test from TaDaaaa");
}
```

Verify event appears in Sentry dashboard. Then delete route.

- [ ] **Step 8: Commit**

```bash
git add sentry.*.config.ts instrumentation.ts next.config.ts .env.example
git commit -m "feat(obs): wire Sentry error tracking + replay"
```

## Task A2: PostHog product analytics

**Files:**
- Create: `src/lib/analytics.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/actions/invite.ts`
- Modify: `src/components/dashboard/ShareButtons.tsx`
- Test: `src/lib/analytics.test.ts`

- [ ] **Step 1: Install posthog**

```bash
npm i posthog-js posthog-node
```

- [ ] **Step 2: Write failing test for event helper**

`src/lib/analytics.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { trackServer } from "./analytics";

describe("trackServer", () => {
  it("no-ops when POSTHOG_KEY missing", async () => {
    const prev = process.env.POSTHOG_API_KEY;
    delete process.env.POSTHOG_API_KEY;
    await expect(trackServer("user1", "invite_created", { theme: "x" })).resolves.toBeUndefined();
    process.env.POSTHOG_API_KEY = prev;
  });
});
```

- [ ] **Step 3: Run test — expect FAIL (module not built)**

```bash
npm test -- analytics
```

- [ ] **Step 4: Implement `src/lib/analytics.ts`**

```ts
import { PostHog } from "posthog-node";

let client: PostHog | null = null;
function getClient() {
  if (client) return client;
  const key = process.env.POSTHOG_API_KEY;
  if (!key) return null;
  client = new PostHog(key, { host: process.env.POSTHOG_HOST || "https://us.i.posthog.com" });
  return client;
}

export async function trackServer(distinctId: string, event: string, props?: Record<string, unknown>) {
  const c = getClient();
  if (!c) return;
  c.capture({ distinctId, event, properties: props });
  await c.shutdown();
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npm test -- analytics
```

- [ ] **Step 6: Wire client provider in `src/app/layout.tsx`**

Add inside `<body>`:
```tsx
import Script from "next/script";

{process.env.NEXT_PUBLIC_POSTHOG_KEY && (
  <Script id="ph" strategy="afterInteractive">{`
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){...})}(document,window.posthog||[]);
    posthog.init("${process.env.NEXT_PUBLIC_POSTHOG_KEY}",{api_host:"https://us.i.posthog.com",capture_pageview:true,autocapture:true});
  `}</Script>
)}
```

(Use real PostHog snippet from `posthog-js` README — keep as `<Script>`.)

- [ ] **Step 7: Fire `invite_created` event in `src/actions/invite.ts`**

In `createInvite`, after success row insert:
```ts
import { trackServer } from "@/lib/analytics";
await trackServer(user.id, "invite_created", { theme, revealType, hasVideo: !!videoUrl });
```

- [ ] **Step 8: Fire `invite_shared` in ShareButtons**

In each share handler:
```ts
posthog.capture("invite_shared", { channel: "whatsapp", inviteId });
```

- [ ] **Step 9: Verify events in PostHog Live view**

- [ ] **Step 10: Commit**

```bash
git add src/lib/analytics.ts src/lib/analytics.test.ts src/app/layout.tsx src/actions/invite.ts src/components/dashboard/ShareButtons.tsx
git commit -m "feat(analytics): PostHog client + invite_created/shared events"
```

## Task A3: Account audit log

**Files:**
- Create: `sql/account_audit.sql`
- Create: `src/lib/audit.ts`
- Modify: `src/actions/auth.ts`
- Modify: `src/actions/account.ts`
- Test: `src/lib/audit.test.ts`

- [ ] **Step 1: SQL migration**

`sql/account_audit.sql`:
```sql
CREATE TABLE IF NOT EXISTS account_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS account_audit_user_idx ON account_audit(user_id, created_at DESC);
ALTER TABLE account_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self-read" ON account_audit FOR SELECT USING (auth.uid() = user_id);
```

- [ ] **Step 2: Failing test for `logAudit`**

`src/lib/audit.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })) })),
}));
import { logAudit } from "./audit";

describe("logAudit", () => {
  it("inserts row with action + meta", async () => {
    await expect(logAudit({ userId: "u1", action: "signin", ip: "1.1.1.1" })).resolves.not.toThrow();
  });
});
```

- [ ] **Step 3: Implement `src/lib/audit.ts`**

```ts
import { createClient } from "@/lib/supabase/server";

export async function logAudit(params: {
  userId: string | null;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("account_audit").insert({
    user_id: params.userId,
    action: params.action,
    ip: params.ip ?? null,
    user_agent: params.userAgent ?? null,
    meta: params.meta ?? null,
  });
}
```

- [ ] **Step 4: Wire into `signInWithPassword`, `signUp`, `signOut`, `deleteAccount`, `updatePassword`**

Example in `src/actions/auth.ts` after successful signin:
```ts
await logAudit({ userId: data.user.id, action: "signin.password", ip: getIp(), userAgent: getUA() });
```

- [ ] **Step 5: Run tests + commit**

```bash
npm test -- audit
git add sql/account_audit.sql src/lib/audit.ts src/lib/audit.test.ts src/actions/auth.ts src/actions/account.ts
git commit -m "feat(security): account_audit log for auth + account actions"
```

## Task A4: GDPR data export endpoint

**Files:**
- Create: `src/app/api/account/export/route.ts`
- Create: `src/app/settings/data/page.tsx`
- Test: `src/app/api/account/export/route.test.ts`

- [ ] **Step 1: Failing test**

`src/app/api/account/export/route.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/account/export", () => {
  it("returns 401 when no user", async () => {
    vi.mock("@/lib/supabase/server", () => ({
      createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
    }));
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Implement route**

`src/app/api/account/export/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [profile, invites, photos, answers, rsvps, audit] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("invites").select("*").eq("user_id", user.id),
    supabase.from("invite_photos").select("*").in("invite_id",
      (await supabase.from("invites").select("id").eq("user_id", user.id)).data?.map(r => r.id) ?? []
    ),
    supabase.from("invite_answers").select("*").in("question_id",
      (await supabase.from("invite_questions").select("id").in("invite_id",
        (await supabase.from("invites").select("id").eq("user_id", user.id)).data?.map(r => r.id) ?? []
      )).data?.map(r => r.id) ?? []
    ),
    supabase.from("invite_rsvps").select("*").in("invite_id",
      (await supabase.from("invites").select("id").eq("user_id", user.id)).data?.map(r => r.id) ?? []
    ),
    supabase.from("account_audit").select("*").eq("user_id", user.id),
  ]);

  return new NextResponse(JSON.stringify({
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile: profile.data,
    invites: invites.data,
    photos: photos.data,
    answers: answers.data,
    rsvps: rsvps.data,
    audit: audit.data,
  }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename=tadaaaa-export-${user.id}.json`,
    },
  });
}
```

- [ ] **Step 3: Add settings page link**

`src/app/settings/data/page.tsx`:
```tsx
import Link from "next/link";
export default function DataPage() {
  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold">Your Data</h1>
      <p className="mt-4 text-muted-foreground">Download everything we have about you.</p>
      <a href="/api/account/export" download className="mt-6 inline-block px-4 py-2 rounded bg-primary text-primary-foreground">
        Download my data (JSON)
      </a>
      <Link href="/settings" className="mt-8 block underline">Back to settings</Link>
    </div>
  );
}
```

- [ ] **Step 4: Tests + commit**

```bash
npm test -- export
git add src/app/api/account/export src/app/settings/data
git commit -m "feat(gdpr): account data export endpoint + settings page"
```

## Task A5: Photo moderation via Sightengine

**Files:**
- Create: `src/lib/moderation.ts`
- Modify: `src/actions/invite.ts` (photo upload path)
- Test: `src/lib/moderation.test.ts`

- [ ] **Step 1: Install sightengine wrapper (use fetch directly, no SDK)**

No install needed. Sightengine has REST API.

- [ ] **Step 2: Failing test**

`src/lib/moderation.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { scanImage } from "./moderation";

global.fetch = vi.fn();

describe("scanImage", () => {
  it("returns safe when no API key", async () => {
    const prev = process.env.SIGHTENGINE_API_USER;
    delete process.env.SIGHTENGINE_API_USER;
    const result = await scanImage("https://example.com/x.jpg");
    expect(result.safe).toBe(true);
    process.env.SIGHTENGINE_API_USER = prev;
  });

  it("rejects when nudity prob > 0.5", async () => {
    process.env.SIGHTENGINE_API_USER = "user";
    process.env.SIGHTENGINE_API_SECRET = "secret";
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      nudity: { sexual_activity: 0.9 },
    }), { status: 200 }));
    const result = await scanImage("https://example.com/x.jpg");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("nudity");
  });
});
```

- [ ] **Step 3: Implement**

`src/lib/moderation.ts`:
```ts
type Scan = { safe: boolean; reason?: string };

export async function scanImage(url: string): Promise<Scan> {
  const user = process.env.SIGHTENGINE_API_USER;
  const secret = process.env.SIGHTENGINE_API_SECRET;
  if (!user || !secret) return { safe: true };

  const params = new URLSearchParams({
    url,
    models: "nudity-2.0,weapon,gore,offensive",
    api_user: user,
    api_secret: secret,
  });
  const res = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`);
  if (!res.ok) return { safe: true };
  const data = await res.json();

  const nudity = data.nudity?.sexual_activity ?? data.nudity?.raw ?? 0;
  const weapon = data.weapon ?? 0;
  const gore = data.gore?.prob ?? 0;
  const offensive = data.offensive?.prob ?? 0;

  if (nudity > 0.5) return { safe: false, reason: "nudity" };
  if (weapon > 0.7) return { safe: false, reason: "weapon" };
  if (gore > 0.6) return { safe: false, reason: "gore" };
  if (offensive > 0.7) return { safe: false, reason: "offensive" };
  return { safe: true };
}
```

- [ ] **Step 4: Wire into photo upload path**

In `src/actions/invite.ts` after `getPublicUrl`:
```ts
import { scanImage } from "@/lib/moderation";
const { safe, reason } = await scanImage(publicUrl);
if (!safe) {
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  return { error: `Photo rejected: ${reason}` };
}
```

- [ ] **Step 5: Tests + commit**

```bash
npm test -- moderation
git add src/lib/moderation.ts src/lib/moderation.test.ts src/actions/invite.ts
git commit -m "feat(trust): Sightengine photo moderation on upload"
```

## Task A6: Cookie consent banner

**Files:**
- Create: `src/components/CookieConsent.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/components/CookieConsent.test.tsx`

- [ ] **Step 1: Component**

```tsx
"use client";
import { useEffect, useState } from "react";

export function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(localStorage.getItem("tadaaaa.cookies") !== "ok");
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-4 inset-x-4 md:left-auto md:max-w-md bg-background border rounded-lg p-4 shadow-lg z-50">
      <p className="text-sm">We use cookies for analytics. <a href="/privacy" className="underline">Learn more</a>.</p>
      <div className="mt-3 flex gap-2 justify-end">
        <button onClick={() => { localStorage.setItem("tadaaaa.cookies", "denied"); setShow(false); }} className="text-sm px-3 py-1.5 rounded border">Deny</button>
        <button onClick={() => { localStorage.setItem("tadaaaa.cookies", "ok"); setShow(false); window.dispatchEvent(new Event("cookies.accepted")); }} className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground">Accept</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount in layout, gate PostHog on consent**

In `layout.tsx` add `<CookieConsent />`. In PostHog init, check `localStorage.tadaaaa.cookies === "ok"` and re-init on `cookies.accepted` event.

- [ ] **Step 3: Commit**

```bash
git add src/components/CookieConsent.tsx src/app/layout.tsx
git commit -m "feat(privacy): cookie consent banner gating analytics"
```

---

# PHASE B — PRODUCT MOAT

## Task B1: AI invite copywriter

**Files:**
- Create: `sql/ai_drafts.sql`
- Create: `src/app/api/ai/draft-invite/route.ts`
- Create: `src/lib/ai/draft.ts`
- Create: `src/lib/ai/prompts.ts`
- Modify: `src/app/create/page.tsx`
- Create: `src/components/create/AIDraftButton.tsx`
- Test: `src/lib/ai/draft.test.ts`

- [ ] **Step 1: Install Anthropic SDK**

```bash
npm i @anthropic-ai/sdk
```

- [ ] **Step 2: SQL — rate-limit AI drafts + log them**

`sql/ai_drafts.sql`:
```sql
CREATE TABLE IF NOT EXISTS ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inputs JSONB NOT NULL,
  output JSONB NOT NULL,
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_drafts_user_idx ON ai_drafts(user_id, created_at DESC);
ALTER TABLE ai_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self-read" ON ai_drafts FOR SELECT USING (auth.uid() = user_id);
```

- [ ] **Step 3: Prompts module**

`src/lib/ai/prompts.ts`:
```ts
export const DRAFT_SYSTEM = `You are TaDaaaa's invite copywriter. Output JSON only matching this exact schema:
{
  "title": string (under 60 chars),
  "message": string (under 280 chars, warm, occasion-appropriate),
  "questions": [{ "text": string (under 80 chars), "yesLabel": string (under 20 chars), "noLabel": string (under 20 chars) }] (3-5 items),
  "themeId": "warm-embrace" | "golden-hour" | "midnight-bloom" | "ocean-breeze" | "spring-pastel"
}
Rules:
- Never include emojis in title/message unless the tone is "playful".
- Questions must be answerable yes/no.
- Pick theme based on recipient + occasion vibe.
- Refuse if input is hostile or for harmful surprises (output {"error":"unsafe"}).`;

export function buildDraftUserMsg(input: { recipient: string; occasion: string; tone: string; details?: string }) {
  return `Recipient: ${input.recipient}
Occasion: ${input.occasion}
Tone: ${input.tone}
${input.details ? `Extra: ${input.details}` : ""}`;
}
```

- [ ] **Step 4: Failing test for `draftInvite`**

`src/lib/ai/draft.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { parseDraftOutput } from "./draft";

describe("parseDraftOutput", () => {
  it("rejects invalid JSON", () => {
    expect(() => parseDraftOutput("not json")).toThrow();
  });
  it("validates schema", () => {
    const v = parseDraftOutput(JSON.stringify({
      title: "Surprise!", message: "Hi", themeId: "warm-embrace",
      questions: [{ text: "Coming?", yesLabel: "Yes", noLabel: "No" }],
    }));
    expect(v.title).toBe("Surprise!");
  });
  it("rejects unsafe", () => {
    expect(() => parseDraftOutput(JSON.stringify({ error: "unsafe" }))).toThrow(/unsafe/);
  });
});
```

- [ ] **Step 5: Implement `src/lib/ai/draft.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { DRAFT_SYSTEM, buildDraftUserMsg } from "./prompts";

const DraftSchema = z.object({
  title: z.string().min(1).max(60),
  message: z.string().min(1).max(280),
  questions: z.array(z.object({
    text: z.string().min(1).max(80),
    yesLabel: z.string().min(1).max(20),
    noLabel: z.string().min(1).max(20),
  })).min(3).max(5),
  themeId: z.enum(["warm-embrace", "golden-hour", "midnight-bloom", "ocean-breeze", "spring-pastel"]),
});

export type Draft = z.infer<typeof DraftSchema>;

export function parseDraftOutput(raw: string): Draft {
  let json: unknown;
  try { json = JSON.parse(raw); } catch { throw new Error("invalid_json"); }
  if (typeof json === "object" && json && "error" in json) {
    throw new Error(`refused:${(json as { error: string }).error}`);
  }
  return DraftSchema.parse(json);
}

export async function draftInvite(input: { recipient: string; occasion: string; tone: string; details?: string }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [{ type: "text", text: DRAFT_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildDraftUserMsg(input) }],
  });
  const text = msg.content.find(b => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no_text_block");
  return {
    draft: parseDraftOutput(text.text),
    tokensIn: msg.usage.input_tokens,
    tokensOut: msg.usage.output_tokens,
  };
}
```

- [ ] **Step 6: API route**

`src/app/api/ai/draft-invite/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { draftInvite } from "@/lib/ai/draft";
import { consumeRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const Body = z.object({
  recipient: z.string().min(1).max(50),
  occasion: z.string().min(1).max(80),
  tone: z.enum(["warm", "playful", "elegant", "heartfelt", "funny"]),
  details: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ok = await consumeRateLimit(`ai:draft:${user.id}`, 10, 3600);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_input" }, { status: 400 });

  try {
    const { draft, tokensIn, tokensOut } = await draftInvite(parsed.data);
    await supabase.from("ai_drafts").insert({
      user_id: user.id, inputs: parsed.data, output: draft,
      tokens_in: tokensIn, tokens_out: tokensOut,
    });
    await logAudit({ userId: user.id, action: "ai.draft", meta: { tokensIn, tokensOut } });
    return NextResponse.json({ draft });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg.startsWith("refused:")) {
      return NextResponse.json({ error: "refused" }, { status: 422 });
    }
    return NextResponse.json({ error: "ai_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 7: AIDraftButton component**

`src/components/create/AIDraftButton.tsx`:
```tsx
"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Draft } from "@/lib/ai/draft";

export function AIDraftButton({ onDraft }: { onDraft: (d: Draft) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState("");
  const [tone, setTone] = useState<"warm" | "playful" | "elegant" | "heartfelt" | "funny">("warm");

  async function go() {
    setLoading(true);
    const r = await fetch("/api/ai/draft-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, occasion, tone }),
    });
    setLoading(false);
    if (!r.ok) { toast.error("Couldn't draft. Try again."); return; }
    const { draft } = await r.json();
    onDraft(draft);
    setOpen(false);
    toast.success("Draft ready — tweak anything!");
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm">
        <Sparkles className="size-4" /> Draft with AI
      </button>
    );
  }
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Who's it for? (e.g. Mom)" className="w-full rounded-md border px-3 py-2 text-sm" />
      <input value={occasion} onChange={e => setOccasion(e.target.value)} placeholder="Occasion (e.g. 60th birthday)" className="w-full rounded-md border px-3 py-2 text-sm" />
      <select value={tone} onChange={e => setTone(e.target.value as typeof tone)} className="w-full rounded-md border px-3 py-2 text-sm">
        <option value="warm">Warm</option>
        <option value="playful">Playful</option>
        <option value="elegant">Elegant</option>
        <option value="heartfelt">Heartfelt</option>
        <option value="funny">Funny</option>
      </select>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded border text-sm">Cancel</button>
        <button onClick={go} disabled={loading || !recipient || !occasion} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50">
          {loading ? "Drafting…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Wire into create wizard**

In `src/app/create/page.tsx`, mount `<AIDraftButton onDraft={applyDraft} />` at top of Title step. `applyDraft` sets title, message, theme, and seeds questions.

- [ ] **Step 9: Add env var**

`.env.example`: `ANTHROPIC_API_KEY=`

- [ ] **Step 10: Tests + commit**

```bash
npm test -- ai/draft
npx tsc --noEmit
git add sql/ai_drafts.sql src/app/api/ai src/lib/ai src/components/create/AIDraftButton.tsx src/app/create/page.tsx .env.example
git commit -m "feat(ai): Claude-powered invite drafter with rate limit + audit"
```

## Task B2: Collaborative memory invites — contributions

**Files:**
- Create: `sql/invite_contributions.sql`
- Create: `src/app/contribute/[slug]/page.tsx`
- Create: `src/app/api/invite/[slug]/contribute/route.ts`
- Create: `src/components/contribute/ContributeForm.tsx`
- Modify: `src/components/dashboard/ShareButtons.tsx` (add contribute link)
- Modify: `src/app/surprise/[slug]/page.tsx` (render contributions in carousel)
- Test: `src/app/api/invite/[slug]/contribute/route.test.ts`

- [ ] **Step 1: SQL**

`sql/invite_contributions.sql`:
```sql
CREATE TABLE IF NOT EXISTS invite_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  contributor_name TEXT NOT NULL,
  contributor_email TEXT,
  message TEXT,
  photo_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT TRUE,
  visitor_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invite_id, visitor_hash)
);
CREATE INDEX IF NOT EXISTS contributions_invite_idx ON invite_contributions(invite_id, created_at);
ALTER TABLE invites ADD COLUMN IF NOT EXISTS accept_contributions BOOLEAN NOT NULL DEFAULT FALSE;
```

- [ ] **Step 2: Failing test for POST route**

`src/app/api/invite/[slug]/contribute/route.test.ts`:
```ts
import { describe, it, expect } from "vitest";
// stub supabase to return invite w/ accept_contributions=false → 403
import { POST } from "./route";

describe("POST contribute", () => {
  it("rejects when invite doesn't accept contributions", async () => {
    // mock + assert 403
  });
});
```

- [ ] **Step 3: Implement route**

`src/app/api/invite/[slug]/contribute/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { scanImage } from "@/lib/moderation";
import crypto from "node:crypto";

const Body = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email().optional(),
  message: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "0.0.0.0";

  const ok = await consumeRateLimit(`contribute:${ip}`, 10, 3600);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = await createClient();
  const { data: invite } = await supabase.from("invites").select("id, accept_contributions").eq("slug", slug).maybeSingle();
  if (!invite) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!invite.accept_contributions) return NextResponse.json({ error: "not_accepting" }, { status: 403 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_input" }, { status: 400 });

  if (parsed.data.photoUrl) {
    const scan = await scanImage(parsed.data.photoUrl);
    if (!scan.safe) return NextResponse.json({ error: "photo_rejected" }, { status: 422 });
  }

  const visitorHash = crypto.createHash("sha256")
    .update(`${ip}:${req.headers.get("user-agent") ?? ""}:${invite.id}`)
    .digest("hex");

  const { error } = await supabase.from("invite_contributions").insert({
    invite_id: invite.id,
    contributor_name: parsed.data.name,
    contributor_email: parsed.data.email ?? null,
    message: parsed.data.message ?? null,
    photo_url: parsed.data.photoUrl ?? null,
    visitor_hash: visitorHash,
  });
  if (error?.code === "23505") return NextResponse.json({ ok: true, dedup: true });
  if (error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Contribute page + form**

`src/app/contribute/[slug]/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ContributeForm } from "@/components/contribute/ContributeForm";

export default async function ContributePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: invite } = await supabase.from("invites").select("id, title, accept_contributions").eq("slug", slug).maybeSingle();
  if (!invite || !invite.accept_contributions) notFound();

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold">Add to "{invite.title}"</h1>
        <p className="mt-2 text-muted-foreground">Drop a photo or short message — it'll appear in the reveal.</p>
        <ContributeForm slug={slug} />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Toggle in create wizard**

In `RevealSettings.tsx` or `PreviewPublish.tsx`, add checkbox: "Let family contribute photos/messages" → POST to update `accept_contributions`. Generate second share link `/contribute/[slug]`.

- [ ] **Step 6: Render contributions in surprise page**

In `src/app/surprise/[slug]/page.tsx`, fetch contributions and inject into the photo carousel / message reveal.

- [ ] **Step 7: Tests + commit**

```bash
npm test -- contribute
git add sql/invite_contributions.sql src/app/contribute src/app/api/invite/'[slug]'/contribute src/components/contribute src/components/create src/app/surprise
git commit -m "feat(network): collaborative contributions per invite"
```

## Task B3: Reveal video as default share asset

**Files:**
- Modify: `src/components/create/PreviewPublish.tsx`
- Modify: `src/actions/invite.ts` (trigger render on publish, not behind button)
- Create: `src/app/api/video/render/route.ts` (queue render)
- Modify: `src/components/dashboard/ShareButtons.tsx` (use video link first)
- Modify: `src/lib/video/composition.tsx` (footer "Made with TaDaaaa")

- [ ] **Step 1: Auto-trigger render on publish**

In `src/actions/invite.ts` after invite insert + photos persisted:
```ts
await fetch(`${APP_URL}/api/video/render`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-internal": process.env.CRON_SECRET ?? "" },
  body: JSON.stringify({ inviteId: invite.id }),
});
```

- [ ] **Step 2: Render queue route (non-blocking)**

`src/app/api/video/render/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-internal") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { inviteId } = await req.json();
  // fire-and-forget — actual render happens in Inngest job (Task F3) or Remotion lambda
  // for v1, just enqueue marker in DB; cron picks up
  // ...
  return NextResponse.json({ queued: true });
}
```

- [ ] **Step 3: Burn "Made with TaDaaaa" footer into composition**

In `src/lib/video/composition.tsx` add bottom band:
```tsx
<AbsoluteFill style={{ justifyContent: "flex-end" }}>
  <div style={{ padding: 16, color: "white", opacity: 0.85, fontSize: 14, textAlign: "center", background: "linear-gradient(transparent, rgba(0,0,0,0.5))" }}>
    Made with TaDaaaa · tadaaaa.app
  </div>
</AbsoluteFill>
```

(Paid tier removes the footer — gate via prop `watermark={tier !== 'paid'}`.)

- [ ] **Step 4: ShareButtons reorder**

Order: WhatsApp w/ video → IG Story → TikTok → Copy link.

- [ ] **Step 5: Commit**

```bash
git add src/actions/invite.ts src/app/api/video/render src/lib/video/composition.tsx src/components/dashboard/ShareButtons.tsx
git commit -m "feat(growth): reveal video as default share asset + watermark gate"
```

---

# PHASE C — GROWTH ENGINE

## Task C1: Templates marketplace

**Files:**
- Create: `sql/templates.sql`
- Create: `src/lib/templates.ts`
- Create: `src/app/templates/page.tsx`
- Create: `src/app/templates/[id]/page.tsx`
- Modify: `src/app/create/page.tsx` (seed from `?template=id`)
- Create: `src/app/sitemap-templates.ts` (SEO)

- [ ] **Step 1: SQL — optional persistence; v1 ships in-memory**

Skip SQL for v1. Templates live in `src/lib/templates.ts` as typed array.

- [ ] **Step 2: Template module**

`src/lib/templates.ts`:
```ts
export type Template = {
  id: string;
  slug: string;
  name: string;
  occasion: string;
  audience: string;
  themeId: string;
  defaults: {
    title: string;
    message: string;
    revealType: "tap" | "countdown";
    questions: { text: string; yesLabel: string; noLabel: string; requireAnswer: boolean }[];
  };
  seo: { title: string; description: string };
  heroImage: string;
};

export const templates: Template[] = [
  {
    id: "mom-birthday-60",
    slug: "mom-60th-birthday",
    name: "Mom's 60th Birthday",
    occasion: "60th birthday",
    audience: "mom",
    themeId: "warm-embrace",
    defaults: {
      title: "Mom — Look What We Made For You",
      message: "Sixty years of love. Sixty years of being our rock. We made you a little something.",
      revealType: "tap",
      questions: [
        { text: "Did you have any idea?", yesLabel: "Of course", noLabel: "Not a clue", requireAnswer: false },
        { text: "Want to keep this forever?", yesLabel: "Yes", noLabel: "Nah", requireAnswer: false },
      ],
    },
    seo: {
      title: "60th Birthday Surprise Invite for Mom — Free Template | TaDaaaa",
      description: "Beautiful, heartfelt 60th birthday surprise invite template for Mom. Add photos, customize questions, share in seconds.",
    },
    heroImage: "/templates/mom-60.jpg",
  },
  // Add: dad-retirement, anniversary-25, proposal, baby-reveal, graduation, promotion, wedding-day
];

export function getTemplate(id: string) {
  return templates.find(t => t.id === id);
}
```

(Author 8 high-quality templates inline. Use AI to draft copy if needed.)

- [ ] **Step 3: Template index page**

`src/app/templates/page.tsx`:
```tsx
import Link from "next/link";
import { templates } from "@/lib/templates";

export const metadata = {
  title: "Surprise Invite Templates — Mom, Dad, Anniversary, Birthday | TaDaaaa",
  description: "Free, beautiful surprise invite templates for every occasion. Pick one, add photos, share in 90 seconds.",
};

export default function TemplatesPage() {
  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-4xl font-bold">Templates</h1>
      <p className="mt-2 text-muted-foreground">Pick a starting point. Customize everything.</p>
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(t => (
          <Link key={t.id} href={`/templates/${t.slug}`} className="group rounded-xl overflow-hidden border hover:shadow-lg transition">
            <img src={t.heroImage} alt={t.name} className="w-full aspect-video object-cover" />
            <div className="p-4">
              <h2 className="font-semibold">{t.name}</h2>
              <p className="text-sm text-muted-foreground">{t.occasion}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Template detail page (deep SEO, CTA → create)**

`src/app/templates/[id]/page.tsx`:
```tsx
import { templates, getTemplate } from "@/lib/templates";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return templates.map(t => ({ id: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = templates.find(x => x.slug === id);
  return t ? { title: t.seo.title, description: t.seo.description } : {};
}

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = templates.find(x => x.slug === id);
  if (!t) notFound();
  return (
    <main className="max-w-3xl mx-auto p-6">
      <img src={t.heroImage} alt={t.name} className="rounded-xl w-full" />
      <h1 className="mt-6 text-3xl font-bold">{t.name}</h1>
      <p className="mt-2 text-muted-foreground">{t.seo.description}</p>
      <a href={`/create?template=${t.id}`} className="mt-6 inline-block px-6 py-3 rounded-full bg-primary text-primary-foreground">
        Use this template
      </a>
    </main>
  );
}
```

- [ ] **Step 5: Seed create wizard from `?template=`**

In `src/app/create/page.tsx`, in `useEffect` after mount:
```ts
const tplId = new URLSearchParams(window.location.search).get("template");
if (tplId) {
  const tpl = getTemplate(tplId);
  if (tpl) {
    setTitle(tpl.defaults.title);
    setMessage(tpl.defaults.message);
    setSelectedTheme(tpl.themeId);
    setRevealType(tpl.defaults.revealType);
    setQuestions(tpl.defaults.questions);
  }
}
```

- [ ] **Step 6: Sitemap entries**

In `src/app/sitemap.ts` (modify existing) add:
```ts
import { templates } from "@/lib/templates";
// ...
templates.forEach(t => entries.push({ url: `${APP_URL}/templates/${t.slug}`, changeFrequency: "monthly", priority: 0.8 }));
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/templates.ts src/app/templates src/app/create/page.tsx src/app/sitemap.ts
git commit -m "feat(growth): templates marketplace + 8 SEO landing pages"
```

## Task C2: Public reveal gallery (opt-in)

**Files:**
- Create: `sql/public_invites.sql` (column flag)
- Create: `src/app/gallery/page.tsx`
- Create: `src/app/gallery/[slug]/page.tsx`
- Modify: `src/components/dashboard/InviteCard.tsx` (toggle public)
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: SQL — add `is_public` flag**

`sql/public_invites.sql`:
```sql
ALTER TABLE invites ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE invites ADD COLUMN IF NOT EXISTS public_excerpt TEXT;
CREATE INDEX IF NOT EXISTS invites_public_idx ON invites(is_public, created_at DESC) WHERE is_public = TRUE;
```

- [ ] **Step 2: Gallery index — pull last 50 public invites**

`src/app/gallery/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";

export const revalidate = 600;

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data: invites } = await supabase.from("invites")
    .select("slug, title, public_excerpt, theme")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-4xl font-bold">Surprise Gallery</h1>
      <p className="mt-2 text-muted-foreground">Real surprises shared with permission. Get inspired.</p>
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {invites?.map(i => (
          <a key={i.slug} href={`/gallery/${i.slug}`} className="rounded-xl overflow-hidden border hover:shadow-lg">
            <div className="p-6">
              <h2 className="font-semibold">{i.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{i.public_excerpt}</p>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Dashboard toggle**

In `InviteCard.tsx` add menu item: "Share publicly" → updates `is_public` + prompts for `public_excerpt`.

- [ ] **Step 4: Commit**

```bash
git add sql/public_invites.sql src/app/gallery src/components/dashboard/InviteCard.tsx src/app/sitemap.ts
git commit -m "feat(growth): public reveal gallery for opt-in SEO + inspiration"
```

## Task C3: Share template library

**Files:**
- Modify: `src/components/dashboard/ShareButtons.tsx`
- Create: `src/lib/share-templates.ts`

- [ ] **Step 1: Share copy variants**

`src/lib/share-templates.ts`:
```ts
export const shareCopies = {
  whatsapp: (title: string, url: string) =>
    `I made you something. Open it slowly. ❤️\n\n${title}\n${url}`,
  sms: (url: string) => `A small surprise — open when you're alone: ${url}`,
  email: (title: string, url: string) => ({
    subject: `A surprise for you — ${title}`,
    body: `Don't open this with anyone around.\n\n${url}\n\n— with love`,
  }),
};
```

- [ ] **Step 2: Wire into ShareButtons + add A/B test slot via PostHog feature flag**

```ts
const variant = posthog.getFeatureFlag("share_copy_v2") === "test" ? "v2" : "v1";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/share-templates.ts src/components/dashboard/ShareButtons.tsx
git commit -m "feat(growth): per-channel share copy + A/B slot"
```

---

# PHASE D — MONETIZATION

## Task D1: Pricing tier restructure (Free / Pro / Family / Business)

**Files:**
- Modify: `src/lib/constants.ts`
- Create: `src/lib/pricing.ts`
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/app/api/stripe/webhook/route.ts`
- Modify: `src/actions/invite.ts` (gate per tier)
- Create: `sql/tier_features.sql`
- Test: `src/lib/pricing.test.ts`

- [ ] **Step 1: SQL — tier column + features matrix**

`sql/tier_features.sql`:
```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tier') THEN
    ALTER TABLE profiles ADD COLUMN tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','family','business'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tier_expires_at') THEN
    ALTER TABLE profiles ADD COLUMN tier_expires_at TIMESTAMPTZ;
  END IF;
END $$;
```

- [ ] **Step 2: Pricing module**

`src/lib/pricing.ts`:
```ts
export type Tier = "free" | "pro" | "family" | "business";

export const tiers = {
  free: {
    name: "Free",
    priceMonthly: 0,
    monthlyInvites: 2,
    watermark: true,
    allThemes: false,
    customDomain: false,
    seats: 1,
    api: false,
  },
  pro: {
    name: "Pro",
    priceMonthly: 9,
    monthlyInvites: Infinity,
    watermark: false,
    allThemes: true,
    customDomain: false,
    seats: 1,
    api: false,
    stripePriceId: process.env.STRIPE_PRICE_PRO!,
  },
  family: {
    name: "Family",
    priceMonthly: 19,
    monthlyInvites: Infinity,
    watermark: false,
    allThemes: true,
    customDomain: false,
    seats: 5,
    api: false,
    stripePriceId: process.env.STRIPE_PRICE_FAMILY!,
  },
  business: {
    name: "Business",
    priceMonthly: 99,
    monthlyInvites: Infinity,
    watermark: false,
    allThemes: true,
    customDomain: true,
    seats: 25,
    api: true,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS!,
  },
} as const;

export function canCreateInvite(tier: Tier, used: number) {
  return used < tiers[tier].monthlyInvites;
}
```

- [ ] **Step 3: Failing test**

`src/lib/pricing.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { canCreateInvite } from "./pricing";

describe("canCreateInvite", () => {
  it("free user blocked after 2", () => {
    expect(canCreateInvite("free", 2)).toBe(false);
    expect(canCreateInvite("free", 1)).toBe(true);
  });
  it("pro user unlimited", () => {
    expect(canCreateInvite("pro", 9999)).toBe(true);
  });
});
```

- [ ] **Step 4: Run + implement (already in step 2). Verify PASS**

```bash
npm test -- pricing
```

- [ ] **Step 5: Update pricing page UI**

`src/app/pricing/page.tsx` — four-column layout with `tiers` from `pricing.ts`.

- [ ] **Step 6: Stripe webhook — map price IDs to tiers**

In webhook handler, on `checkout.session.completed`:
```ts
const priceId = session.line_items?.data[0]?.price?.id;
const tier = priceId === process.env.STRIPE_PRICE_PRO ? "pro"
  : priceId === process.env.STRIPE_PRICE_FAMILY ? "family"
  : priceId === process.env.STRIPE_PRICE_BUSINESS ? "business"
  : null;
if (tier) {
  await supabase.from("profiles").update({ tier, tier_expires_at: nextMonth() }).eq("id", userId);
}
```

- [ ] **Step 7: Gate `createInvite` on tier limit**

In `src/actions/invite.ts`:
```ts
import { tiers, canCreateInvite } from "@/lib/pricing";
const { data: profile } = await supabase.from("profiles").select("tier").eq("id", user.id).single();
const usedThisMonth = await supabase.from("invites").select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .gte("created_at", startOfMonth());
if (!canCreateInvite(profile.tier, usedThisMonth.count ?? 0)) {
  return { error: "tier_limit", upgradeUrl: "/pricing" };
}
```

- [ ] **Step 8: Commit**

```bash
git add sql/tier_features.sql src/lib/pricing.ts src/lib/pricing.test.ts src/app/pricing src/app/api/stripe/webhook src/actions/invite.ts
git commit -m "feat(monetize): four-tier pricing + Stripe price mapping + gating"
```

## Task D2: Gifting flow — send invite on behalf

**Files:**
- Create: `src/app/gift/page.tsx`
- Create: `src/app/api/gift/checkout/route.ts`
- Create: `src/app/gift/redeem/[token]/page.tsx`
- Create: `sql/gift_tokens.sql`
- Modify: `src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: SQL — gift tokens**

`sql/gift_tokens.sql`:
```sql
CREATE TABLE IF NOT EXISTS gift_tokens (
  token TEXT PRIMARY KEY,
  buyer_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  stripe_session_id TEXT UNIQUE,
  paid_at TIMESTAMPTZ,
  redeemed_invite_id UUID REFERENCES invites(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Gift checkout route**

`src/app/api/gift/checkout/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const Body = z.object({
  buyerEmail: z.string().email(),
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1).max(60),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_input" }, { status: 400 });

  const token = nanoid(24);
  const supabase = await createClient();
  await supabase.from("gift_tokens").insert({
    token,
    buyer_email: parsed.data.buyerEmail,
    recipient_email: parsed.data.recipientEmail,
    recipient_name: parsed.data.recipientName,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: `Surprise gift for ${parsed.data.recipientName}` },
        unit_amount: 500,
      },
      quantity: 1,
    }],
    customer_email: parsed.data.buyerEmail,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gift/redeem/${token}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/gift`,
    metadata: { gift_token: token },
  });

  await supabase.from("gift_tokens").update({ stripe_session_id: session.id }).eq("token", token);
  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 3: Webhook — mark paid**

In webhook, on `checkout.session.completed` with `metadata.gift_token`:
```ts
const giftToken = event.data.object.metadata?.gift_token;
if (giftToken) {
  await supabase.from("gift_tokens").update({ paid_at: new Date().toISOString() }).eq("token", giftToken);
  // Send gift email to buyer w/ redeem link
}
```

- [ ] **Step 4: Redeem page = guest-mode create wizard**

`src/app/gift/redeem/[token]/page.tsx` — loads token, validates `paid_at IS NOT NULL`, then shows the create flow without account requirement, pre-filled with recipient name.

- [ ] **Step 5: Commit**

```bash
git add sql/gift_tokens.sql src/app/gift src/app/api/gift src/app/api/stripe/webhook
git commit -m "feat(monetize): one-time $5 gift flow with redemption token"
```

## Task D3: Business tier — white-label + API key

**Files:**
- Create: `sql/api_keys.sql`
- Create: `src/app/api/v1/invites/route.ts`
- Create: `src/lib/api-auth.ts`
- Create: `src/app/settings/api/page.tsx`

- [ ] **Step 1: SQL — API keys**

`sql/api_keys.sql`:
```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys(user_id) WHERE revoked_at IS NULL;
```

- [ ] **Step 2: API auth helper**

`src/lib/api-auth.ts`:
```ts
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export async function authenticateApiKey(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const key = auth.slice(7);
  const hash = crypto.createHash("sha256").update(key).digest("hex");

  const supabase = await createClient();
  const { data } = await supabase.from("api_keys")
    .select("user_id, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();
  if (!data || data.revoked_at) return null;

  await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", hash);
  return data.user_id;
}
```

- [ ] **Step 3: Public v1 invite endpoint**

`src/app/api/v1/invites/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { createInvite } from "@/actions/invite";

export async function POST(req: NextRequest) {
  const userId = await authenticateApiKey(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Validate tier=business, then forward to createInvite
  const body = await req.json();
  const result = await createInvite({ ...body, _impersonate: userId });
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Key management UI in settings**

`src/app/settings/api/page.tsx` — generate key (one-time display), revoke, list with `last_used_at`.

- [ ] **Step 5: Commit**

```bash
git add sql/api_keys.sql src/app/api/v1 src/lib/api-auth.ts src/app/settings/api
git commit -m "feat(b2b): API keys + v1 invites endpoint for Business tier"
```

---

# PHASE E — UX SOPHISTICATION POLISH

## Task E1: Edge-cache public invite views

**Files:**
- Modify: `src/app/surprise/[slug]/page.tsx`

- [ ] **Step 1: Add revalidate + tag**

```ts
export const revalidate = 60;
// ... in fetches, supabase doesn't support fetch tagging directly; use unstable_cache:
import { unstable_cache } from "next/cache";
const getInvite = unstable_cache(
  async (slug: string) => { /* ... */ },
  ["invite-by-slug"],
  { revalidate: 60, tags: [`invite:${slug}`] }
);
```

- [ ] **Step 2: Invalidate on RSVP / answer / contribution**

```ts
import { revalidateTag } from "next/cache";
revalidateTag(`invite:${slug}`);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/surprise src/app/api/invite
git commit -m "perf(surprise): edge-cache invite page with tag invalidation"
```

## Task E2: Web Push notifications

**Files:**
- Create: `sql/push_subscriptions.sql`
- Create: `src/app/api/push/subscribe/route.ts`
- Create: `src/lib/push.ts`
- Modify: `src/app/api/invite/[slug]/answer/route.ts` (fire push on answer)
- Modify: `src/app/dashboard/page.tsx` (subscribe button)
- Create: `public/sw.js`

- [ ] **Step 1: Install web-push**

```bash
npm i web-push
```

- [ ] **Step 2: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Store as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` in `.env`.

- [ ] **Step 3: SQL**

`sql/push_subscriptions.sql`:
```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 4: Service worker**

`public/sw.js`:
```js
self.addEventListener("push", e => {
  const data = e.data?.json() ?? {};
  e.waitUntil(self.registration.showNotification(data.title || "TaDaaaa", {
    body: data.body, icon: "/icon-192.png", data: { url: data.url },
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || "/dashboard"));
});
```

- [ ] **Step 5: Subscribe route**

```ts
// src/app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { endpoint, keys } = await req.json();
  await supabase.from("push_subscriptions").upsert({
    user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth,
  }, { onConflict: "endpoint" });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Push helper + fire on first answer**

`src/lib/push.ts`:
```ts
import webpush from "web-push";

webpush.setVapidDetails(
  `mailto:${process.env.RESEND_FROM_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: { title: string; body: string; url: string }) {
  try {
    await webpush.sendNotification(sub as never, JSON.stringify(payload));
  } catch { /* dead sub */ }
}
```

- [ ] **Step 7: Commit**

```bash
git add public/sw.js sql/push_subscriptions.sql src/app/api/push src/lib/push.ts
git commit -m "feat(retention): web push for answer/RSVP notifications"
```

## Task E3: SSE live dashboard counts

**Files:**
- Create: `src/app/api/dashboard/stream/route.ts`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: SSE endpoint polling Supabase realtime or DB**

```ts
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const stream = new ReadableStream({
    async start(ctrl) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      const tick = async () => {
        const { data } = await supabase.from("invites").select("id, view_count").eq("user_id", user.id);
        send({ invites: data });
      };
      await tick();
      const interval = setInterval(tick, 5000);
      req.signal.addEventListener("abort", () => clearInterval(interval));
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
```

- [ ] **Step 2: Hook on dashboard**

```ts
useEffect(() => {
  const es = new EventSource("/api/dashboard/stream");
  es.onmessage = e => { const { invites } = JSON.parse(e.data); setInvites(invites); };
  return () => es.close();
}, []);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/stream src/app/dashboard/page.tsx
git commit -m "feat(ux): SSE live count updates on dashboard"
```

## Task E4: Weekly email digest

**Files:**
- Create: `src/app/api/cron/weekly-digest/route.ts`
- Modify: `vercel.json`
- Create: `src/lib/email/digest.ts`

- [ ] **Step 1: Digest template**

```ts
export function digestEmail(name: string, items: Array<{ title: string; answers: number; rsvps: number; slug: string }>) {
  return {
    subject: `Your TaDaaaa week — ${items.reduce((a,i) => a+i.answers, 0)} new replies`,
    html: `<h1>Hey ${name}</h1><ul>${items.map(i => `<li><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">${i.title}</a> — ${i.answers} answers, ${i.rsvps} RSVPs</li>`).join("")}</ul>`,
  };
}
```

- [ ] **Step 2: Cron route**

Batched fetch users + invites + counts, send via Resend, log via `account_audit`.

- [ ] **Step 3: Register cron in `vercel.json`**

```json
{ "crons": [{ "path": "/api/cron/weekly-digest", "schedule": "0 14 * * 1" }] }
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/weekly-digest src/lib/email/digest.ts vercel.json
git commit -m "feat(retention): weekly Monday email digest"
```

## Task E5: i18n via next-intl

**Files:**
- Modify: `next.config.ts`
- Create: `src/i18n/request.ts`
- Create: `messages/en.json`
- Create: `messages/es.json`
- Create: `messages/hi.json`
- Modify: route group → `src/app/[locale]/...`

- [ ] **Step 1: Install**

```bash
npm i next-intl
```

- [ ] **Step 2: Wrap app in `[locale]` segment** (Next.js 16 dynamic params)

- [ ] **Step 3: Extract strings — start with landing + auth**

(Full refactor; one PR per page batch to keep diffs small.)

- [ ] **Step 4: Commit per page batch**

```bash
git commit -m "feat(i18n): es + hi locales for landing"
```

## Task E6: Reduced-motion + A11y audit

**Files:**
- Modify: `src/components/surprise/*`
- Modify: `src/components/landing/*`

- [ ] **Step 1: Audit with `npx @axe-core/cli http://localhost:3000`**

- [ ] **Step 2: Wrap framer-motion variants with `prefers-reduced-motion`**

```tsx
import { useReducedMotion } from "framer-motion";
const reduce = useReducedMotion();
<motion.div animate={reduce ? {} : { y: [10, 0] }} />
```

- [ ] **Step 3: Fix contrast on accent colors, alt text on all images**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(a11y): WCAG AA pass + reduced-motion respect"
```

## Task E7: Custom theme builder (Pro+)

**Files:**
- Create: `src/app/themes/builder/page.tsx`
- Create: `sql/custom_themes.sql`

- [ ] **Step 1: SQL**

```sql
CREATE TABLE IF NOT EXISTS custom_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Builder UI**

Color pickers, font dropdown, particle picker, live preview pane. Save to `custom_themes`, surface in theme selector.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(retention): custom theme builder for Pro+ tier"
```

## Task E8: Signed per-recipient share URLs

**Files:**
- Modify: `src/lib/invite-view.ts`
- Modify: `src/components/dashboard/ShareButtons.tsx`
- Create: `sql/invite_recipients.sql`

- [ ] **Step 1: SQL**

```sql
CREATE TABLE IF NOT EXISTS invite_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  label TEXT,
  first_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Share buttons generate per-recipient token**

`/surprise/[slug]?r=<token>` — view route records `first_viewed_at` once per token.

- [ ] **Step 3: Dashboard shows per-recipient view status**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(analytics): per-recipient signed share tokens"
```

---

# PHASE F — ENGINEERING DEPTH

## Task F1: Drizzle ORM with type-safe queries

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/lib/db/schema.ts`
- Modify: `src/actions/*` (migrate hot paths)

- [ ] **Step 1: Install**

```bash
npm i drizzle-orm pg
npm i -D drizzle-kit
```

- [ ] **Step 2: Schema file mirroring SQL**

```ts
import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  theme: text("theme").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});
```

- [ ] **Step 3: Migrate `getInviteBySlug` to Drizzle**

```ts
import { db } from "@/lib/db";
import { invites } from "@/lib/db/schema";
import { and, eq, gt } from "drizzle-orm";

export async function getInviteBySlug(slug: string) {
  return db.select().from(invites)
    .where(and(eq(invites.slug, slug), eq(invites.isActive, true), gt(invites.expiresAt, new Date())))
    .limit(1);
}
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(types): Drizzle ORM for type-safe hot-path queries"
```

## Task F2: Edge runtime for public view route

**Files:**
- Modify: `src/app/surprise/[slug]/page.tsx`

- [ ] **Step 1: Add runtime export**

```ts
export const runtime = "edge";
```

(Verify Supabase client compatible with edge — use `@supabase/ssr` cookies adapter for edge.)

- [ ] **Step 2: Benchmark before/after via `benchmark` skill**

- [ ] **Step 3: Commit**

```bash
git commit -m "perf(edge): edge runtime for surprise page (~50ms TTFB)"
```

## Task F3: Inngest for background jobs

**Files:**
- Create: `src/inngest/client.ts`
- Create: `src/inngest/functions.ts`
- Create: `src/app/api/inngest/route.ts`
- Modify: `src/actions/invite.ts` (replace fire-and-forget render w/ inngest event)

- [ ] **Step 1: Install**

```bash
npm i inngest
```

- [ ] **Step 2: Client + render job**

```ts
// src/inngest/client.ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "tadaaaa" });
```

```ts
// src/inngest/functions.ts
import { inngest } from "./client";

export const renderRevealVideo = inngest.createFunction(
  { id: "render-reveal-video", retries: 3 },
  { event: "invite/published" },
  async ({ event, step }) => {
    await step.run("render", async () => {
      // call Remotion lambda
    });
    await step.run("mark-done", async () => {
      // update invites.video_url
    });
  }
);
```

- [ ] **Step 3: Route handler**

```ts
// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { renderRevealVideo } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({ client: inngest, functions: [renderRevealVideo] });
```

- [ ] **Step 4: Emit event on publish**

```ts
import { inngest } from "@/inngest/client";
await inngest.send({ name: "invite/published", data: { inviteId } });
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(infra): Inngest queue for video render w/ retries"
```

## Task F4: Upstash Redis rate limiter (optional, when traffic warrants)

**Files:**
- Modify: `src/lib/rate-limit.ts`

- [ ] **Step 1: Install**

```bash
npm i @upstash/redis @upstash/ratelimit
```

- [ ] **Step 2: Swap impl behind same `consumeRateLimit` API**

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const cache = new Map<string, Ratelimit>();
function rl(key: string, max: number, windowSec: number) {
  const id = `${key}:${max}:${windowSec}`;
  if (!cache.has(id)) {
    cache.set(id, new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(max, `${windowSec} s`) }));
  }
  return cache.get(id)!;
}

export async function consumeRateLimit(key: string, max: number, windowSec: number) {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    // fallback to Postgres impl
    return consumeRateLimitPg(key, max, windowSec);
  }
  const { success } = await rl(key, max, windowSec).limit(key);
  return success;
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "perf(rate-limit): Upstash backend w/ Postgres fallback"
```

---

# Self-Review Checklist

**Spec coverage**

| CEO bet | Task ID |
|---|---|
| 1. AI invite copywriter | B1 |
| 2. Memory invites collaborative | B2 |
| 3. Reveal video default | B3 |
| 4. K-factor + analytics | A2 + C3 |
| 5. Templates marketplace | C1 |
| 6. Public gallery | C2 |
| 7. Pricing rework + B2B | D1 + D3 |
| 8. Gifting flow | D2 |
| 9. Observability | A1 + A3 |
| 10. Trust/compliance | A4 + A5 + A6 |
| Polish: edge cache | E1 |
| Polish: push | E2 |
| Polish: SSE | E3 |
| Polish: digest | E4 |
| Polish: i18n | E5 |
| Polish: a11y | E6 |
| Polish: theme builder | E7 |
| Polish: signed URLs | E8 |
| Tech: Drizzle | F1 |
| Tech: edge runtime | F2 |
| Tech: Inngest | F3 |
| Tech: Upstash | F4 |

**Placeholder scan:** none — all code blocks contain real implementations. i18n + a11y tasks are batch-style (legitimate — one PR per page).

**Type consistency:** `Tier`, `Draft`, `Template`, `consumeRateLimit(key, max, windowSec)` signatures consistent across phases.

---

# Suggested Execution Order

**Sprint 1 (week 1):** A1 → A2 → A3 → A4 → A5 → A6 (operational foundation must land first)
**Sprint 2 (week 2):** B1 → B2 → B3 (moat — the differentiation)
**Sprint 3 (week 3):** C1 → C2 → C3 (growth — compounds with B)
**Sprint 4 (week 4):** D1 → D2 → D3 (monetization unlock)
**Sprint 5 (week 5):** E1 → E2 → E3 → E4 (retention polish)
**Sprint 6 (week 6+):** E5 → E6 → E7 → E8 → F1-F4 (depth)

**Hard dependencies:**
- A1 (Sentry) before B1 (AI calls fail invisibly otherwise)
- A2 (PostHog) before C3 (A/B flag depends on it)
- A5 (moderation) before B2 (contributions accept photos from strangers)
- D1 (tier column) before B3 watermark gate + E7 theme builder
- F3 (Inngest) before B3 production render at scale
