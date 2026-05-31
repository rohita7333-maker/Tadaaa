# Designer Invites (D1 + D2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paid users get downloadable Canva-grade "designer" invite art (D1) plus an upgraded designer share-card for link previews (D2); free users see the same tiles locked behind an upsell.

**Architecture:** The deployed Next.js app CANNOT call the Canva Connect MCP at runtime — that MCP is the agent's dev-time tool, not a runtime dependency, and Canva Connect REST would need OAuth + likely Canva Pro. Instead we render designer art **server-side with `next/og` `ImageResponse` (Satori/JSX)**, the exact engine already used in `src/app/surprise/[slug]/opengraph-image.tsx`. Canva MCP is used by the agent ONCE, at design time, to produce visual reference comps; those comps are hand-translated into JSX templates checked into the repo. Result: zero runtime Canva quota, zero OAuth, fully self-hosted, paid-gated.

**Tech Stack:** Next.js 16 (App Router), React 19, `next/og` ImageResponse, Supabase (tier from `profiles.subscription_tier`), Tailwind v4, existing tier helpers in `src/lib/tier.ts`.

**Scope — Fork 1 = D1 + D2 only.** D3 (story export), D4 (collage), D5 (template bank) are OUT of this plan.

---

## Design-time prerequisite (agent, before Task 1)

Agent uses Canva MCP (`generate-design` / `generate-design-structured` / `export-design`, all Free-tier) to produce 1–2 reference comps per occasion (birthday, date, festival, mothers_day, apology, custom). These are VISUAL REFERENCE ONLY — screenshots saved to `docs/superpowers/plans/assets/`. Each generate/export call hits the connected Canva account quota. **STOP GATE: do not run more than ~6 generate calls without user OK; if quota errors → halt, report, await Canva Pro decision.** No design comp blocks code — Task 1 can start with placeholder gradients if comps not ready.

tadaaaa-uiux-motion owns translating comps → JSX template tokens (palette, type scale, layout) per TaDaaaa brand. Use `impeccable` + `ui-ux-pro-max` skills for the template visual pass.

---

## File Structure

- Create `src/lib/designer-art.ts` — tier gate `canUseDesignerArt(tier)` + shared template metadata (occasion → palette/label).
- Create `src/app/api/invite/[slug]/art/route.ts` — GET, returns designer art as PNG via `ImageResponse`, gated to paid owner. Query `?format=png` (pdf deferred).
- Create `src/components/surprise/DesignerArtButton.tsx` — download button (paid) OR locked upsell tile (free) on reveal page + dashboard card.
- Modify `src/app/surprise/[slug]/opengraph-image.tsx` — D2: branch to designer template when invite owner is paid.
- Create test files alongside (see tasks).

Files that change together live together; gate logic isolated in `designer-art.ts` so both the art route and OG image import one source of truth.

---

### Task 1: Tier gate + template metadata

**Files:**
- Create: `src/lib/designer-art.ts`
- Test: `src/lib/__tests__/designer-art.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { canUseDesignerArt, getTemplate } from "../designer-art";

describe("canUseDesignerArt", () => {
  it("blocks free tier", () => {
    expect(canUseDesignerArt("free")).toBe(false);
  });
  it("allows plus and unlimited", () => {
    expect(canUseDesignerArt("plus")).toBe(true);
    expect(canUseDesignerArt("unlimited")).toBe(true);
  });
});

describe("getTemplate", () => {
  it("returns a template for a known occasion", () => {
    const t = getTemplate("birthday");
    expect(t.label).toBeTruthy();
    expect(t.background).toContain("gradient");
  });
  it("falls back to custom for unknown occasion", () => {
    const t = getTemplate("not_real");
    expect(t).toEqual(getTemplate("custom"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/designer-art.test.ts`
Expected: FAIL — `canUseDesignerArt is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Tier } from "./tier";

export function canUseDesignerArt(tier: Tier): boolean {
  return tier === "plus" || tier === "unlimited";
}

export interface DesignerTemplate {
  label: string;
  background: string; // CSS gradient string usable by Satori
  accent: string;
  emoji: string;
}

const TEMPLATES: Record<string, DesignerTemplate> = {
  birthday: { label: "Birthday Surprise", background: "linear-gradient(135deg, #FFE7D9 0%, #F8B4B8 60%, #E88891 100%)", accent: "#C4686D", emoji: "🎂" },
  date: { label: "A Special Invitation", background: "linear-gradient(135deg, #FDE2E4 0%, #E2B5C2 100%)", accent: "#B05C7A", emoji: "🌹" },
  festival: { label: "Festival Greetings", background: "linear-gradient(135deg, #FFF3D6 0%, #F5C77E 100%)", accent: "#C98A2B", emoji: "✨" },
  mothers_day: { label: "For You, Mom", background: "linear-gradient(135deg, #FCE4EC 0%, #F1A7C1 100%)", accent: "#B05C7A", emoji: "💐" },
  apology: { label: "A Heartfelt Message", background: "linear-gradient(135deg, #EAEFF5 0%, #B9C7D6 100%)", accent: "#5E708A", emoji: "🙏" },
  custom: { label: "A Surprise For You", background: "linear-gradient(135deg, #FFF8F0 0%, #F5E6E0 100%)", accent: "#C4686D", emoji: "💌" },
};

export function getTemplate(occasion: string | null | undefined): DesignerTemplate {
  return TEMPLATES[occasion ?? "custom"] ?? TEMPLATES.custom;
}
```

> Note: tadaaaa-uiux-motion may refine palettes/labels from Canva comps. Keep keys + signatures stable.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/designer-art.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/designer-art.ts src/lib/__tests__/designer-art.test.ts
git commit -m "feat: designer-art tier gate + template metadata"
```

---

### Task 2: Designer art download route (D1)

**Files:**
- Create: `src/app/api/invite/[slug]/art/route.ts`
- Test: `src/app/api/invite/[slug]/art/__tests__/route.test.ts`

Behavior: GET `/api/invite/<slug>/art`. Load invite (slug → title, occasion_type, creator_id, is_active, expires_at). Load owner profile tier via `getActiveTier`. If not active / expired → 410. If owner tier not paid → 403 `{ error: "upgrade_required" }`. Else render `ImageResponse` (1200×1500 portrait, printable) from `getTemplate(occasion)` + title. Return PNG with `Content-Disposition: attachment; filename="<slug>-invite.png"`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { title: "Sara 30th", occasion_type: "birthday", creator_id: "u1", is_active: true, expires_at: null },
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/tier", async (orig) => {
  const mod = await orig<typeof import("@/lib/tier")>();
  return { ...mod, getActiveTier: () => "free" as const };
});

import { GET } from "../route";

describe("designer art route", () => {
  it("403s for free-tier owner", async () => {
    const res = await GET(new Request("http://x/api/invite/abc/art"), {
      params: Promise.resolve({ slug: "abc" }),
    });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/api/invite/[slug]/art/__tests__/route.test.ts"`
Expected: FAIL — module `../route` not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveTier } from "@/lib/tier";
import { canUseDesignerArt, getTemplate } from "@/lib/designer-art";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: invite } = await supabase
    .from("invites")
    .select("title, occasion_type, creator_id, is_active, expires_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!invite || !invite.is_active ||
      (invite.expires_at && new Date(invite.expires_at) < new Date())) {
    return NextResponse.json({ error: "inactive" }, { status: 410 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", invite.creator_id)
    .maybeSingle();

  const tier = getActiveTier(profile ?? null);
  if (!canUseDesignerArt(tier)) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  const t = getTemplate(invite.occasion_type);
  const title = invite.title || t.label;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 1500, background: t.background, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontSize: 180 }}>{t.emoji}</div>
        <div style={{ fontSize: 84, fontWeight: 700, color: t.accent, marginTop: 40, textAlign: "center", padding: "0 80px" }}>{title}</div>
        <div style={{ fontSize: 36, color: "#6B5E57", marginTop: 24 }}>made with TaDaaaa</div>
      </div>
    ),
    {
      width: 1200,
      height: 1500,
      headers: { "Content-Disposition": `attachment; filename="${slug}-invite.png"` },
    }
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/api/invite/[slug]/art/__tests__/route.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/invite/[slug]/art/route.tsx" "src/app/api/invite/[slug]/art/__tests__/route.test.ts"
git commit -m "feat: designer art download route, paid-gated (D1)"
```

> Note: file is `.tsx` (JSX in route). Adjust import path in test if extension differs.

---

### Task 3: Reveal + dashboard surface — button (paid) / locked upsell (free)

**Files:**
- Create: `src/components/surprise/DesignerArtButton.tsx`
- Modify: reveal entry (`src/components/surprise/MessageReveal.tsx`) — mount `DesignerArtButton` with `slug` + `canUse` prop.
- Modify: `src/components/dashboard/InviteCard.tsx` — same component, compact variant.
- Test: `src/components/surprise/__tests__/DesignerArtButton.test.tsx`

Props: `{ slug: string; canUse: boolean; variant?: "full" | "compact" }`. `canUse=true` → anchor to `/api/invite/<slug>/art` with `download`. `canUse=false` → button styled with lock badge; onClick opens upsell (reuse `FreeLimitBanner` copy tone / link to `/pricing`). The locked tile IS the advertisement to free users.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DesignerArtButton } from "../DesignerArtButton";

describe("DesignerArtButton", () => {
  it("paid: renders download link to art route", () => {
    render(<DesignerArtButton slug="abc" canUse={true} />);
    const link = screen.getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute("href", "/api/invite/abc/art");
  });
  it("free: renders locked upsell, no art link", () => {
    render(<DesignerArtButton slug="abc" canUse={false} />);
    expect(screen.queryByRole("link", { name: /download/i })).toBeNull();
    expect(screen.getByText(/unlock|upgrade|pro/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/components/surprise/__tests__/DesignerArtButton.test.tsx"`
Expected: FAIL — component not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
"use client";
import Link from "next/link";
import { Download, Lock } from "lucide-react";

interface Props { slug: string; canUse: boolean; variant?: "full" | "compact"; }

export function DesignerArtButton({ slug, canUse, variant = "full" }: Props) {
  const base = "inline-flex items-center gap-2 rounded-full font-medium transition";
  const size = variant === "compact" ? "px-3 py-1.5 text-sm" : "px-5 py-2.5";
  if (canUse) {
    return (
      <Link href={`/api/invite/${slug}/art`} download className={`${base} ${size} bg-[#C4686D] text-white hover:bg-[#a8555a]`}>
        <Download className="w-4 h-4" /> Download designer invite
      </Link>
    );
  }
  return (
    <Link href="/pricing" className={`${base} ${size} bg-[#F1E3DA] text-[#6B5E57] hover:bg-[#e9d6ca]`}>
      <Lock className="w-4 h-4" /> Unlock designer invites — go Pro ✨
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/components/surprise/__tests__/DesignerArtButton.test.tsx"`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire into reveal + dashboard**

In `MessageReveal.tsx`: import `DesignerArtButton`, render `<DesignerArtButton slug={slug} canUse={ownerCanUseDesignerArt} />` near share controls. The reveal already resolves invite + owner; pass owner tier through (`canUseDesignerArt(getActiveTier(ownerProfile))`). If owner tier not already loaded on reveal, add `subscription_tier, subscription_expires_at` to the owner select.

In `InviteCard.tsx`: render `<DesignerArtButton slug={invite.slug} canUse={canUseDesignerArt(tier)} variant="compact" />`. Dashboard already knows current user tier.

- [ ] **Step 6: Run full suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors; all tests green.

- [ ] **Step 7: Commit**

```bash
git add src/components/surprise/DesignerArtButton.tsx src/components/surprise/__tests__/DesignerArtButton.test.tsx src/components/surprise/MessageReveal.tsx src/components/dashboard/InviteCard.tsx
git commit -m "feat: designer art button + free-tier locked upsell (advertise)"
```

---

### Task 4: Designer share-card on link preview (D2)

**Files:**
- Modify: `src/app/surprise/[slug]/opengraph-image.tsx`
- Test: covered by manual OG fetch + existing render (Satori OG hard to unit-test; verify via build + browser).

Behavior: OG image already loads invite. Add owner tier lookup; if `canUseDesignerArt(tier)` → render the designer template (reuse `getTemplate`) instead of the current default OG layout. Free owners keep current OG. This upgrades paid users' link previews automatically.

- [ ] **Step 1: Add owner tier to the existing query**

Extend the invite select to also fetch `creator_id`; then second query for owner `subscription_tier, subscription_expires_at`; compute `const paid = canUseDesignerArt(getActiveTier(profile))`.

- [ ] **Step 2: Branch the JSX**

```tsx
import { getTemplate, canUseDesignerArt } from "@/lib/designer-art";
import { getActiveTier } from "@/lib/tier";
// ...after loading invite + profile:
const t = getTemplate(invite?.occasion_type);
const paid = canUseDesignerArt(getActiveTier(profile ?? null));
const background = paid ? t.background : "linear-gradient(135deg, #FFF8F0 0%, #F5E6E0 100%)";
const accent = paid ? t.accent : "#2D2926";
// use `background` + `accent` in the existing container style
```

- [ ] **Step 3: Verify build renders both paths**

Run: `npm run build`
Expected: build clean, OG route compiles. Manually fetch `/surprise/<paid-slug>/opengraph-image` and `/surprise/<free-slug>/opengraph-image` in dev → paid shows occasion palette, free shows default.

- [ ] **Step 4: Commit**

```bash
git add "src/app/surprise/[slug]/opengraph-image.tsx"
git commit -m "feat: paid designer share-card on link preview (D2)"
```

---

### Task 5: QA + browser verification

**Owner:** tadaaaa-qa-test.

- [ ] Free user invite → reveal shows LOCKED "go Pro" tile, `/api/invite/<slug>/art` returns 403, OG = default. 
- [ ] Paid user invite (set `subscription_tier='plus'` on a test profile) → reveal shows Download, art route returns PNG attachment, OG = designer palette.
- [ ] Expired/inactive invite → art route 410.
- [ ] `npx tsc --noEmit` 0 errors, `npx vitest run` all green, `npm run build` clean.
- [ ] Browser pass via Playwright/agent-browser: download button works, locked tile links to `/pricing`.

---

## Self-Review

- **Spec coverage:** D1 = Tasks 1–3 (gate + route + button). D2 = Task 4. Advertise-to-free = Task 3 locked tile. Paid-only gate = `canUseDesignerArt` enforced in route (Task 2) AND UI (Task 3) AND OG (Task 4). ✓
- **Out of scope (declared):** D3/D4/D5. ✓
- **Type consistency:** `canUseDesignerArt(tier: Tier)`, `getTemplate(occasion): DesignerTemplate` used identically across Tasks 1/2/3/4. `getActiveTier(profile)` matches `src/lib/tier.ts`. ✓
- **Arch honesty:** no runtime Canva call anywhere; Canva MCP only at design-time for reference comps. ✓
- **STOP gate:** Canva generate/export capped to ~6 calls without user OK; Pro upgrade is a user decision. ✓

---

## Open decisions deferred to user (not blocking code)

1. PDF export format (currently PNG only) — add later if print demand.
2. Pricing page `/pricing` target — confirm route exists or stub.
3. Canva Pro — only needed if we later move to dynamic per-user Canva rendering (D3+) or run many reference comps. D1+D2 ship without it.

## Execution options

1. **Subagent-Driven (recommended)** — fresh subagent per task, CEO review between tasks.
2. **Inline** — execute in session with checkpoints.
