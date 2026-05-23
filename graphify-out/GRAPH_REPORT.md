# Graph Report - surprise-invite  (2026-05-23)

## Corpus Check
- 171 files · ~70,639 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 858 nodes · 1324 edges · 69 communities (49 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `52367ef8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Account Management|Account Management]]
- [[_COMMUNITY_Navbar + Utilities|Navbar + Utilities]]
- [[_COMMUNITY_Invite Actions|Invite Actions]]
- [[_COMMUNITY_Auth Flow|Auth Flow]]
- [[_COMMUNITY_Auth Callback + Email|Auth Callback + Email]]
- [[_COMMUNITY_Landing Page|Landing Page]]
- [[_COMMUNITY_Sound System|Sound System]]
- [[_COMMUNITY_Questions + Responses|Questions + Responses]]
- [[_COMMUNITY_Create Wizard UI|Create Wizard UI]]
- [[_COMMUNITY_AI Draft (B1)|AI Draft (B1)]]
- [[_COMMUNITY_Photo Upload + Preview|Photo Upload + Preview]]
- [[_COMMUNITY_App Layout|App Layout]]
- [[_COMMUNITY_Question Builder|Question Builder]]
- [[_COMMUNITY_Contribute Form (B2)|Contribute Form (B2)]]
- [[_COMMUNITY_Remotion Video|Remotion Video]]
- [[_COMMUNITY_AI Draft Schema|AI Draft Schema]]
- [[_COMMUNITY_Surprise Reveal Core|Surprise Reveal Core]]
- [[_COMMUNITY_Floating Photos|Floating Photos]]
- [[_COMMUNITY_Pricing Page|Pricing Page]]
- [[_COMMUNITY_Share + Analytics|Share + Analytics]]
- [[_COMMUNITY_Onboarding Modal|Onboarding Modal]]
- [[_COMMUNITY_Polaroid Scroll (B2)|Polaroid Scroll (B2)]]
- [[_COMMUNITY_Audit Log Tests|Audit Log Tests]]
- [[_COMMUNITY_Supabase Middleware|Supabase Middleware]]
- [[_COMMUNITY_Contribute Route Tests|Contribute Route Tests]]
- [[_COMMUNITY_Message Reveal|Message Reveal]]
- [[_COMMUNITY_Photo Carousel|Photo Carousel]]
- [[_COMMUNITY_RSVP Button|RSVP Button]]
- [[_COMMUNITY_About Page|About Page]]
- [[_COMMUNITY_Create Step Indicator|Create Step Indicator]]
- [[_COMMUNITY_Next.js Config + CSP|Next.js Config + CSP]]
- [[_COMMUNITY_Apple Icon|Apple Icon]]
- [[_COMMUNITY_App Icon|App Icon]]
- [[_COMMUNITY_OG Image|OG Image]]
- [[_COMMUNITY_PWA Icon 192|PWA Icon 192]]
- [[_COMMUNITY_PWA Icon 512|PWA Icon 512]]
- [[_COMMUNITY_Privacy Page|Privacy Page]]
- [[_COMMUNITY_Verify Email Page|Verify Email Page]]
- [[_COMMUNITY_Terms Page|Terms Page]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Sitemap|Sitemap]]
- [[_COMMUNITY_Error Page|Error Page]]
- [[_COMMUNITY_Manifest (PWA)|Manifest (PWA)]]
- [[_COMMUNITY_Loading Page|Loading Page]]
- [[_COMMUNITY_Surprise Error Boundary|Surprise Error Boundary]]
- [[_COMMUNITY_Dashboard Error Boundary|Dashboard Error Boundary]]
- [[_COMMUNITY_Create Error Boundary|Create Error Boundary]]
- [[_COMMUNITY_Next Env Types|Next Env Types]]
- [[_COMMUNITY_Sentry Instrumentation|Sentry Instrumentation]]
- [[_COMMUNITY_Vitest Config|Vitest Config]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 61 edges
2. `rateLimit()` - 28 edges
3. `createAdminClient()` - 28 edges
4. `4. Patterns That Won (Reusable)` - 21 edges
5. `TaDaaaa — Session Handoff (2026-05-23)` - 21 edges
6. `createClient()` - 18 edges
7. `createServiceClient()` - 18 edges
8. `Files Modified in TaDaaaa` - 18 edges
9. `getIp()` - 17 edges
10. `TaDaaaa Session Diary` - 15 edges

## Surprising Connections (you probably didn't know these)
- `ForgotPasswordPage()` --calls--> `register()`  [INFERRED]
  src/app/auth/forgot-password/page.tsx → instrumentation.ts
- `ResetPasswordPage()` --calls--> `register()`  [INFERRED]
  src/app/auth/reset-password/page.tsx → instrumentation.ts
- `AuthForm()` --calls--> `register()`  [INFERRED]
  src/components/auth/AuthForm.tsx → instrumentation.ts
- `TestSurprisePage()` --calls--> `getThemeById()`  [EXTRACTED]
  src/app/surprise/test/page.tsx → src/lib/themes.ts
- `renderVideo()` --calls--> `calculateDuration()`  [INFERRED]
  src/app/api/video/generate/route.ts → src/lib/video/composition.tsx

## Communities (69 total, 20 thin omitted)

### Community 0 - "Account Management"
Cohesion: 0.05
Nodes (60): ALLOWED_AVATAR_MIME, deleteAccount(), getProfile(), updateNotifications(), uploadAvatar(), createInvite(), deleteInvite(), getInviteBySlug() (+52 more)

### Community 1 - "Navbar + Utilities"
Cohesion: 0.05
Nodes (58): MessageEditorProps, RevealSettings(), RevealSettingsProps, InviteCard(), InviteCardProps, NavbarProps, cn(), formatViewCount() (+50 more)

### Community 2 - "Invite Actions"
Cohesion: 0.06
Nodes (40): emailDomain(), ipKey(), sendPasswordReset(), signIn(), signInWithGoogle(), signInWithMagicLink(), signOut(), signUp() (+32 more)

### Community 3 - "Auth Flow"
Cohesion: 0.04
Nodes (45): 0. The Loop, 10. The Anti-Slop Pledge (Hallmark), 11. Common Gotchas (caught in TaDaaaa build), 12. Pointers, 1. Phase Map (what we did for TaDaaaa), 2. Skill Routing — When to fire what, 3. The Stack (defaults — override deliberately), 4.10 Visitor token RSVP dedup (+37 more)

### Community 4 - "Auth Callback + Email"
Cohesion: 0.06
Nodes (23): Draft, draftInvite(), DraftSchema, parseDraftOutput(), v, THEME_IDS, buildDraftUserMsg(), AIDraftButton() (+15 more)

### Community 5 - "Landing Page"
Cohesion: 0.05
Nodes (40): code:bash (npm i drizzle-orm pg), code:ts (import { pgTable, uuid, text, timestamp, boolean, integer } ), code:ts (import { db } from "@/lib/db";), code:bash (git commit -m "feat(types): Drizzle ORM for type-safe hot-pa), code:ts (export const runtime = "edge";), code:bash (git commit -m "perf(edge): edge runtime for surprise page (~), code:bash (npm i inngest), code:ts (// src/inngest/client.ts) (+32 more)

### Community 6 - "Sound System"
Cohesion: 0.05
Nodes (38): code:bash (npm i @sentry/nextjs), code:ts (import { describe, it, expect, vi } from "vitest";), code:bash (npm test -- analytics), code:ts (import { PostHog } from "posthog-node";), code:bash (npm test -- analytics), code:tsx (import Script from "next/script";), code:ts (import { trackServer } from "@/lib/analytics";), code:ts (posthog.capture("invite_shared", { channel: "whatsapp", invi) (+30 more)

### Community 7 - "Questions + Responses"
Cohesion: 0.06
Nodes (30): code:bash (git commit -m "feat(analytics): per-recipient signed share t), code:ts (export const revalidate = 60;), code:ts (import { revalidateTag } from "next/cache";), code:bash (git add src/app/surprise src/app/api/invite), code:bash (npm i web-push), code:bash (npx web-push generate-vapid-keys), code:js (self.addEventListener("push", e => {), code:ts (// src/app/api/push/subscribe/route.ts) (+22 more)

### Community 8 - "Create Wizard UI"
Cohesion: 0.16
Nodes (20): BRAND, button(), esc(), inviteAnsweredEmail(), inviteViewedEmail(), layout(), monthlyReengagementEmail(), welcomeEmail() (+12 more)

### Community 9 - "AI Draft (B1)"
Cohesion: 0.08
Nodes (23): Architecture / Patterns (carry-forward), code:block1 (sql/increment_view_count.sql       # UPDATED — RETURNS INTEG), code:block2 (# Supabase), Deploy Checklist, Dev Server Runbook, Env Vars, Genuinely Open (low priority), Google Cloud Console — required config (+15 more)

### Community 10 - "Photo Upload + Preview"
Cohesion: 0.09
Nodes (22): Build Status, code:sql (alter table invites), DB Changes (run on shared Supabase project), Files Modified in TaDaaaa, New Dependencies (already installed), PhotoCarousel Bug Fixed, `src/actions/invite.ts`, `src/app/create/page.tsx` (REWRITTEN) (+14 more)

### Community 11 - "App Layout"
Cohesion: 0.1
Nodes (19): code:bash (npm i @anthropic-ai/sdk), code:ts (export const DRAFT_SYSTEM = `You are TaDaaaa's invite copywr), code:ts (import { describe, it, expect, vi } from "vitest";), code:ts (import Anthropic from "@anthropic-ai/sdk";), code:ts (import { NextRequest, NextResponse } from "next/server";), code:tsx ("use client";), code:bash (npm test -- ai/draft), code:ts (import { describe, it, expect } from "vitest";) (+11 more)

### Community 12 - "Question Builder"
Cohesion: 0.11
Nodes (7): getLandingStats(), LandingPage(), floatingCards, formatCount(), Hero(), steps, testimonials

### Community 13 - "Contribute Form (B2)"
Cohesion: 0.11
Nodes (17): code:sql (DO $$), code:ts (export type Tier = "free" | "pro" | "family" | "business";), code:ts (import { describe, it, expect } from "vitest";), code:bash (npm test -- pricing), code:ts (const priceId = session.line_items?.data[0]?.price?.id;), code:ts (import { tiers, canCreateInvite } from "@/lib/pricing";), code:bash (git add sql/tier_features.sql src/lib/pricing.ts src/lib/pri), code:ts (import { NextRequest, NextResponse } from "next/server";) (+9 more)

### Community 14 - "Remotion Video"
Cohesion: 0.18
Nodes (12): getInviteResponses(), saveQuestions(), ResponsesModalProps, InviteAnswer, InviteQuestion, QuestionWithAnswers, Dialog(), DialogBody() (+4 more)

### Community 15 - "AI Draft Schema"
Cohesion: 0.18
Nodes (7): audioCache, playSound(), SOUND_URLS, SoundName, CelebrationOverlayProps, Stage, TapToRevealProps

### Community 16 - "Surprise Reveal Core"
Cohesion: 0.21
Nodes (6): Props, ThemeSelectorProps, Occasion, occasions, Theme, themes

### Community 17 - "Floating Photos"
Cohesion: 0.22
Nodes (7): NotFound(), ContributeForm(), ContributeFormProps, ERROR_COPY, ContributePage(), metadata, Props

### Community 18 - "Pricing Page"
Cohesion: 0.24
Nodes (6): caveat, dmSans, metadata, playfair, CookieConsent(), Toaster()

### Community 19 - "Share + Analytics"
Cohesion: 0.27
Nodes (5): calculateDuration(), PhotoSlide, SurpriseVideo(), SurpriseVideoProps, Root()

### Community 20 - "Onboarding Modal"
Cohesion: 0.2
Nodes (10): 2026-05-21 — Dev server + hydration bugs (caught via browser QA), Bug 1 — Turbopack workspace root misdetection, Bug 2 — Hydration mismatch (introduced by my P2 "fix"), code:tsx (const [showIntro, setShowIntro] = useState(false);  // SSR-s), Files Modified, Fix — two-render pattern, Handoff, Patterns Reinforced (+2 more)

### Community 21 - "Polaroid Scroll (B2)"
Cohesion: 0.25
Nodes (6): CountdownReveal(), CountdownRevealProps, getTimeLeft(), Stage, TimeLeft, VideoPlayerProps

### Community 22 - "Audit Log Tests"
Cohesion: 0.28
Nodes (7): FloatingPhotos(), FloatingPhotosProps, generatePositions(), getPhotoSize(), PhotoPosition, Zone, ZONES

### Community 23 - "Supabase Middleware"
Cohesion: 0.22
Nodes (8): 2026-05-07, 2026-05-07 (session 3 — Settings, Pricing, Security, Moderation), 2026-05-10, 2026-05-16 — Landing Page UX + Architecture Gaps, 2026-05-18 — Security Audit + Gap Fixes + Handoff, 2026-05-22, 2026-05-22 (session 2 — Phase B2 collaborative invites), TaDaaaa Session Diary

### Community 24 - "Contribute Route Tests"
Cohesion: 0.25
Nodes (4): metadata, Plan, plans, PricingCTAProps

### Community 25 - "Message Reveal"
Cohesion: 0.25
Nodes (8): 2026-05-21 — Google OAuth error reframe + BUILD_PROCESS.md + idea-to-app agent, Findings, Handoff, Manual steps (user), Patterns Reinforced, Session, Shipped, Verification

### Community 26 - "Photo Carousel"
Cohesion: 0.29
Nodes (3): OnboardingModalProps, steps, Props

### Community 27 - "RSVP Button"
Cohesion: 0.29
Nodes (7): 2026-05-20 — P1 batch (after P0), Handoff, New Files, Patterns Reinforced, Session, Shipped, Verification

### Community 28 - "About Page"
Cohesion: 0.29
Nodes (7): 2026-05-20 — E2E Audit + P0 Ship-Blocker Fixes, Audit pass (4 parallel agents), Handoff, Key Architecture Decisions, New SQL Files, P0 Fixes Shipped (14), Verification

### Community 29 - "Create Step Indicator"
Cohesion: 0.29
Nodes (7): 2026-05-20 — All remaining P1 + Hallmark onboarding, Handoff, New Files, Patterns Reinforced, Session, Shipped (15 items), Verification

### Community 30 - "Next.js Config + CSP"
Cohesion: 0.29
Nodes (7): 2026-05-21 — Google OAuth live + HANDOFF rewrite + agent v2, Handoff, Patterns Reinforced, Session, Shipped, Verification, Verified

### Community 31 - "Apple Icon"
Cohesion: 0.33
Nodes (4): Note, Photo, PolaroidScrollProps, TILTS

### Community 32 - "App Icon"
Cohesion: 0.33
Nodes (5): MOCK_PHOTOS, MOCK_QUESTIONS, MODES, TestSurprisePage(), THEMES

### Community 33 - "OG Image"
Cohesion: 0.33
Nodes (5): adminInsertOk, arg, errSpy, insertOk, insertReject

### Community 34 - "PWA Icon 192"
Cohesion: 0.33
Nodes (6): 2026-05-20 — P2 polish closure, Handoff, Patterns Reinforced, Session, Shipped, Verification

### Community 35 - "PWA Icon 512"
Cohesion: 0.6
Nodes (3): config, proxy(), updateSession()

### Community 36 - "Privacy Page"
Cohesion: 0.4
Nodes (3): Reason, REASONS, ReportButtonProps

### Community 39 - "PostCSS Config"
Cohesion: 0.4
Nodes (3): Photo, PhotoCarouselProps, TILTS

### Community 40 - "ESLint Config"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **384 isolated node(s):** `config`, `eslintConfig`, `securityHeaders`, `nextConfig`, `config` (+379 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Navbar + Utilities` to `Surprise Reveal Core`, `Invite Actions`, `Remotion Video`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Account Management` to `Invite Actions`, `Question Builder`, `Remotion Video`, `Contribute Route Tests`, `Photo Carousel`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Account Management` to `Floating Photos`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `config`, `eslintConfig`, `securityHeaders` to the rest of the system?**
  _384 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Account Management` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Navbar + Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Invite Actions` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._