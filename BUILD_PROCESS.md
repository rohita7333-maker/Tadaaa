# Build Process — TaDaaaa (Idea → Ship)

A complete, reproducible playbook for taking a product idea to a shipped Next.js + Supabase + Stripe SaaS. Captured from the live build of TaDaaaa (a surprise-invite generator). Reuse for any future app.

This doc pairs with the agent at `~/.claude/agents/idea-to-app.md` — the agent automates the pipeline; this doc explains the *why* behind each step so you can override decisions deliberately.

---

## 0. The Loop

```
Idea
  ↓ brainstorming      (clarify, narrow, test)
  ↓ writing-plans      (write down spec; do not skip)
  ↓ make-plan          (decompose into atomic phases)
  ↓ frontend-design + hallmark   (design language; reject AI-slop copy)
  ↓ backend-dev        (Supabase schema, RLS, RPCs)
  ↓ test-driven-development     (write tests first)
  ↓ webapp-testing (Playwright)  (browser QA)
  ↓ security-review-action      (P0 audit)
  ↓ simplify + review           (clean diff)
  ↓ caveman-commit              (terse messages)
  ↓ ship / land-and-deploy      (Vercel)
  ↓ Memory persistence (auto)
```

Every skill listed above is invoked via the `Skill` tool — naming a skill in prose ≠ firing it. The `idea-to-app` agent enforces the actual invocation.

---

## 1. Phase Map (what we did for TaDaaaa)

| Phase | What ships | Skills fired | Memory write |
|---|---|---|---|
| 0 Discovery | One-pager spec, user persona, success metric | `brainstorming` → `office-hours` | `project_<name>_spec.md` |
| 1 Stack pick | Next.js / Supabase / Tailwind / Stripe baseline | `brainstorming` | implicit in spec |
| 2 DB schema | Tables, RLS, RPCs, indexes | `backend-dev` | `project_<name>_db.md` |
| 3 Design system | Colors / typography / components / themes | `frontend-design` + `hallmark` | `project_<name>_design.md` |
| 4 Core flow | Create → share → view → respond | `tdd` (one slice at a time) | diary entries per slice |
| 5 Auth + Profile | Email + Google + magic link, settings, avatar | `backend-dev` + `tdd` | diary |
| 6 Monetization | Stripe checkout, webhook, tier gates | `backend-dev` + `security-review` | `project_<name>_payments.md` |
| 7 Notifications | Email templates, cron, unsubscribe | `backend-dev` + `frontend-design` | diary |
| 8 Audit + harden | OWASP top-10 sweep, race conditions, dead writes | `security-review-action` | `project_<name>_security_patterns.md` |
| 9 P1 / P2 polish | Error boundaries, PWA, tests, onboarding | `frontend-design` + `webapp-testing` | diary |
| 10 Ship | Vercel deploy, SQL migrations, env vars | `land-and-deploy` + `canary` | diary closing entry |

The CEO audit in TaDaaaa added 14 P0 + 25 P1 + 8 P2 fixes after phase 8. Build them into Phase 8 next time so they don't pile up.

---

## 2. Skill Routing — When to fire what

Pulled from the CLAUDE.md auto-routing tables. **Multi-signal = chain in order**.

### Always fire at session start
- `using-superpowers` — orientation
- (Implicitly) read `memory/MEMORY.md`, `HANDOFF.md`, `AGENTS.md`

### By task signal

| Signal | Skill(s) |
|---|---|
| "I have an idea" / new app | `brainstorming` → `office-hours` → `writing-plans` → `make-plan` |
| New feature with multi-step spec | `writing-plans` → `tdd` → `webapp-testing` |
| UI / page / component | `frontend-design` + `hallmark` (anti-slop) |
| Landing page / marketing | `frontend-design` + `brand-guidelines` + `hallmark` |
| API route / DB / auth / cron | `backend-dev` |
| Bug / 500 / "not working" | `diagnose` → optionally `investigate` for deep dive |
| Test, QA, "does it work" | `webapp-testing` → Playwright MCP |
| Security / pre-deploy | `security-review-action` → `cso` for monthly |
| Refactor / cleanup | `simplify` + `review` |
| Commit message | `caveman-commit` |
| Architecture audit | `graphify` → read `GRAPH_REPORT.md` |
| Ship to prod | `ship` → `land-and-deploy` → `canary` |
| Past work recall | `mem-search` |
| Plugin / MCP / skill creation | `plugin-structure` / `mcp-builder` / `skill-development` |

### Skill etiquette
- Fire skill BEFORE writing code — not after.
- Multiple signals → chain via `Skill` tool calls in sequence (one per response is fine; revisit when next signal hits).
- Never ask the user "should I use X?". Detect → fire → report.

---

## 3. The Stack (defaults — override deliberately)

### Frontend
- **Next.js 16** with App Router + Turbopack. `"use client"` only where state lives.
- **React 19**.
- **Tailwind v4** via `@tailwindcss/postcss`. `globals.css` does `@import "tailwindcss"`.
- **framer-motion** for animation.
- **shadcn/ui** as the component baseline; replace pieces that look AI-slop with Hallmark-styled originals.
- **sonner** for toasts.
- **react-hook-form** + **zod** for forms.
- **lucide-react** for icons.

### Backend / Data
- **Supabase** — Auth + Postgres + Storage. Share one project across multiple apps when small; use schemas to isolate.
- **Postgres-only patterns** (no Redis):
  - **Distributed rate limit** via `consume_rate_limit(key, limit, window_ms)` RPC. INSERT … ON CONFLICT DO UPDATE counter. Fails OPEN on DB outage.
  - **Webhook idempotency** via `claim_stripe_event(event_id, type)` dedupe table.
  - **Customer binding** via `verify_stripe_customer(user_id, customer_id)` — first event binds, mismatches reject.
  - **Atomic claims** via conditional UPDATE: `update.neq(field, target_state).select(id)` is atomic per-row.
  - **Post-increment counters** that `RETURN` the new value — race-free "first occurrence" detection.
- **Stripe** for payments. Webhook is the source of truth; client UI is decoration.
- **Resend** for transactional email.

### Infra
- **Vercel** for hosting + cron (`vercel.json`).
- **Postgres triggers / RPCs** instead of background workers when latency permits.
- **Sentry** when scale demands; skip in MVP.

---

## 4. Patterns That Won (Reusable)

Each survived adversarial review or a real bug. Carry forward.

### 4.1 Rate limiting (cross-instance)
- `src/lib/rate-limit.ts` calls `consume_rate_limit` RPC. ASYNC — every caller `await`s.
- Fail OPEN on RPC error: log + return true. DB outage cannot lock everyone out.

### 4.2 Stripe webhook (three layers)
1. `stripe.webhooks.constructEvent(body, signature, secret)` — signature check.
2. `claim_stripe_event(event.id, event.type)` — dedupe. Returns false on replay → respond 200.
3. `verify_stripe_customer(user_id, customer_id)` — binding. First event binds; mismatches 400.

Plus a `stripe_session_id` lookup on `invites` for Plus per-invite matching, fallback to "most recent UNPAID invite of theme".

### 4.3 Atomic video render claim
```ts
await supabase
  .from("invites")
  .update({ video_status: "processing", video_started_at: nowIso })
  .eq("id", inviteId)
  .neq("video_status", "processing")   // <-- atomic guard
  .select("id");
```
Loser sees empty array → 409. No app-level mutex.

### 4.4 First-view email race
- Migration: `increment_view_count` now `RETURNS INTEGER` (post-update count).
- Route reads the new count and emails only when `newCount === 1`.

### 4.5 Active/expired consistency
Every read path (`getInviteBySlug`, `/api/invite/answer`, `/api/invite/view`, `/api/invite/rsvp`) filters all three: `is_active=true`, `status != 'expired'`, `expires_at IS NULL OR expires_at > now()`. Cron sets both `status='expired'` AND `is_active=false`.

### 4.6 Unsubscribe (CAN-SPAM / GDPR)
`src/lib/unsubscribe.ts` mints `HMAC-SHA256((userId:listKey), CRON_SECRET)` token. Independent list keys (`monthly` / `view` / `answer`). `/api/unsubscribe` GET + POST (RFC 8058). Constant-time compare. No new env required.

### 4.7 Welcome dedup
`profiles.welcomed_at` timestamp. Auth callback checks + sets it on first session. Removed welcome from signUp (Supabase confirm email + custom welcome were double-firing).

### 4.8 Open-redirect allowlist in callback
Explicit prefix allowlist: `/dashboard`, `/create`, `/settings`, `/pricing`, `/auth/reset-password`, `/about`. Rejects `//`, `\`, embedded schemes. Anything outside → `/dashboard`.

### 4.9 SSR-safe state hydration
**Never** read `sessionStorage` / `localStorage` / `window.matchMedia` / URL params inside `useState(() => …)`. Server returns one value, client returns another → hydration mismatch. Use SSR-safe `useState(false)` + sync in `useEffect`. Lint rule `react-hooks/set-state-in-effect` will flag setState; disable per-line with rationale comment. Hydration correctness > lint preference.

### 4.10 Visitor token RSVP dedup
Opaque UUID in `localStorage` (`tadaaaa.visitor_token`). Server SHA-256 hashes before storing. Unique constraint on `(invite_id, visitor_hash)`. IP-based would over-collapse households.

### 4.11 PWA via metadata routes
`app/manifest.ts` + `app/icon1.tsx` (192) + `app/icon2.tsx` (512). `ImageResponse` renders the icon — no PNGs to maintain. `purpose: "any"` only (TS rejects combined `"any maskable"` string).

### 4.12 Audio cache release
Module-level `Map<url, HTMLAudioElement>` cache retains nodes for tab lifetime. Export `releaseSounds(names?)` for explicit cleanup.

### 4.13 Inline derivation > effect-driven clamp
`const safeCurrent = Math.min(current, photos.length - 1)` beats `setCurrent(photos.length - 1)` in a useEffect. Saves a render and avoids `set-state-in-effect` rule.

### 4.14 Async-in-effect with cancelled flag
React 19 forbids fire-and-forget `.then(set)`. Wrap in async IIFE + cancelled flag:
```ts
useEffect(() => {
  let cancelled = false;
  (async () => {
    const d = await fetch(...);
    if (!cancelled) setX(d);
  })();
  return () => { cancelled = true; };
}, [deps]);
```

### 4.15 CSP dev/prod NODE_ENV split
Next.js HMR + React fast-refresh need `'unsafe-eval'` in dev. Prod build doesn't. Gate via `process.env.NODE_ENV !== "production"`. Add `frame-ancestors 'none'`, `form-action 'self'`, `upgrade-insecure-requests`.

### 4.16 Shared lib over server→own-API hop
When a server component needs the logic from an API route, extract to a lib both call. Avoids `fetch(${env}/api/...)` failing silently when env is undefined. Pattern: `src/lib/invite-view.ts` → `logInviteViewBySlug(slug, ua, ip)` used by both SSR page (via `headers()`) and `/api/invite/view`.

### 4.17 Welcome / monthly cron batching
Sequential loop = cron timeout at scale. Chunk into N (default 25), `Promise.allSettled` per chunk. Per-user parallel `Promise.all` for sub-queries. Return `{sent, failed, total}`.

### 4.18 deleteAccount session ordering
`auth.signOut()` BEFORE `admin.deleteUser(user.id)` so the cookie is invalidated before the row vanishes. Prevents 1s window of stale-cookie ghost session.

### 4.19 Required-question gate
Server schema rejects non-boolean answers (already does via `typeof !== "boolean"`). Client blocks advancing required questions when submission fails (after 3 retries). Optional questions warn + advance.

### 4.20 Hallmark copy template
Eyebrow + warm body + verbs-first titles. 3 steps for onboarding. "Pick a moment worth remembering / Make it feel like you / Hand it over with a link". No "Welcome aboard!" or "🎉 Let's get started!" slop. Dismissible, progress dots, persisted in `localStorage`.

---

## 5. Anti-Patterns (Avoid)

| Pitfall | Why bad | What to do instead |
|---|---|---|
| In-memory rate limit Map | Resets per Vercel cold start | DB-backed Postgres RPC |
| Trusting `metadata.user_id` in Stripe webhook | Anyone with signing secret can mint tier | Bind via `verify_stripe_customer` |
| `single()` for profile rows | New users have no row → silent skip | `maybeSingle()` + default-on + auto-upsert |
| `signOut()` after `deleteUser()` | Stale cookie ghost session | Order reversed |
| `useState(() => readStorage())` | SSR / CSR mismatch | useState(default) + useEffect sync |
| `fetch(${env}/api/...)` from server component | Env undefined = undefined URL → silent fail | Shared lib |
| `'unsafe-eval'` in prod CSP | Tightens nothing; dev-only need | Gate via NODE_ENV |
| `redirect_to=...:3005` while serving :3000 | OAuth callback 500s | Sync `NEXT_PUBLIC_APP_URL` with dev port |
| Sequential cron `for (profile of profiles)` | Timeout at scale | Chunk + `Promise.allSettled` |
| Per-PNG PWA icons | Maintenance + cache invalidation | `app/manifest.ts` + dynamic `icon{N}.tsx` |
| `@import "tailwindcss"` cached in `.next` | Old workspace root sticks | `rm -rf .next node_modules/.cache` after any workspace-root change |

---

## 6. SQL Playbook (run these before any Stripe-bearing app ships)

```sql
-- 1. atomic counter
CREATE OR REPLACE FUNCTION increment_view_count(invite_id UUID)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE new_count INTEGER;
BEGIN
  UPDATE invites SET view_count = view_count + 1
  WHERE id = invite_id RETURNING view_count INTO new_count;
  RETURN new_count;
END $$;

-- 2. distributed rate limit
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INTEGER NOT NULL DEFAULT 0
);
CREATE OR REPLACE FUNCTION consume_rate_limit(p_key TEXT, p_limit INT, p_window_ms BIGINT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
  v_cutoff TIMESTAMPTZ := NOW() - (p_window_ms || ' milliseconds')::INTERVAL;
BEGIN
  -- opportunistic cleanup
  DELETE FROM rate_limits WHERE window_start < v_cutoff;
  INSERT INTO rate_limits (key, window_start, count) VALUES (p_key, NOW(), 1)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN rate_limits.window_start < v_cutoff THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start < v_cutoff THEN NOW() ELSE rate_limits.window_start END
    RETURNING window_start, count INTO v_window_start, v_count;
  RETURN v_count <= p_limit;
END $$;

-- 3. webhook idempotency
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION claim_stripe_event(p_event_id TEXT, p_event_type TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO stripe_events (event_id, event_type) VALUES (p_event_id, p_event_type)
  ON CONFLICT (event_id) DO NOTHING;
  RETURN FOUND;
END $$;

-- 4. customer binding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
CREATE OR REPLACE FUNCTION verify_stripe_customer(p_user_id UUID, p_customer_id TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE existing TEXT;
BEGIN
  SELECT stripe_customer_id INTO existing FROM profiles WHERE id = p_user_id;
  IF existing IS NULL THEN
    UPDATE profiles SET stripe_customer_id = p_customer_id WHERE id = p_user_id;
    RETURN TRUE;
  END IF;
  RETURN existing = p_customer_id;
END $$;
```

Plus app-specific tables (invites, photos, questions, answers, views, rsvps, profiles, etc.).

---

## 7. Env vars (template)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App (MUST match dev port — port mismatch = OAuth callback 500)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Cron + Unsubscribe HMAC (same secret powers both)
CRON_SECRET=
```

---

## 8. Verification Gates (before shipping)

| Gate | Command | Pass condition |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npm test` | all pass |
| Lint | `npm run lint` | 0 errors (warnings OK with rationale) |
| Browser QA | Playwright MCP → `/`, `/auth/signup`, `/auth/signin`, `/pricing`, `/auth/verify-email`, `/settings` | 0 console errors, no hydration warning |
| Stripe webhook | `stripe trigger checkout.session.completed` | 200 + idempotent on replay |
| PWA | DevTools → Application → Manifest | manifest + icon1 + icon2 all 200 |
| Cron | Smoke-test `/api/cron/expire-invites` + `/api/cron/monthly-email` with `Authorization: Bearer $CRON_SECRET` | 200 |

---

## 9. Session Discipline (every chat ends with this)

1. Update `HANDOFF.md` with what shipped, what remains, verification status.
2. Append a dated entry to `memory/diary.md` (Session / Shipped / Patterns Reinforced / Files Modified / Handoff).
3. Update or extend `~/.claude/projects/-Users-rohit-Downloads-ClaudeCodeProject/memory/project_*.md` for patterns worth carrying to future projects.
4. Mark tasks complete via `TaskUpdate`.
5. If sessions paused: leave `HANDOFF.md` self-contained so a fresh agent can pick up.

Skipping memory = half the work. Future-you will redo it.

---

## 10. The Anti-Slop Pledge (Hallmark)

Refuse:
- "Welcome aboard!"
- "🎉 Let's get started!"
- "Sign up for free today!"
- Adjective stacks ("incredible, beautiful, magical")
- Emoji confetti in every sentence
- "Crafted with love"
- "Power up your X"
- "Built different"

Prefer:
- Verb-first imperatives ("Pick a moment worth remembering")
- Specific nouns ("A birthday. A reveal. A way of saying thank you.")
- Sentence-first then headline ("Loved by 12,400+ people who made someone's day unforgettable" beats "💖 12K+ users!")
- 3–5 step onboarding with eyebrow + body, not a feature dump

---

## 11. Common Gotchas (caught in TaDaaaa build)

| Symptom | Root cause | Fix |
|---|---|---|
| Hydration mismatch on landing | `useState(() => readSessionStorage())` | useState(default) + useEffect sync |
| Tailwind `Can't resolve 'tailwindcss'` after env change | Stale `.next` cache with old workspace root | `rm -rf .next node_modules/.cache` |
| OAuth redirect goes to `localhost:3005` | `NEXT_PUBLIC_APP_URL` doesn't match dev port | Sync env to actual port |
| Google "Unsupported provider" | Supabase dashboard provider disabled | Enable in Authentication → Providers; add Google Cloud OAuth client |
| Stripe webhook tier-mint | Trusts `metadata.user_id`, no customer binding | Add `verify_stripe_customer` RPC |
| Free user publishes premium theme by direct POST | UI-gated only | Server `createInvite` checks `is_paid` / tier |
| Cron sets `status="expired"` but UI checks `is_active` | Split-brain across two fields | Set both in cron; queries check both |
| First-view email fires twice | Stale read of `view_count` before increment | `increment_view_count RETURNS INTEGER`; gate email on `newCount === 1` |
| `signOut()` after `deleteUser()` leaves stale cookie | Wrong order | Swap |
| Magic link silently auto-registers | `shouldCreateUser` defaults true | `shouldCreateUser: false`; new users → `/auth/signup` |
| Hyrdation warning in production | Lazy `useState` reads window | SSR-safe default + effect sync + eslint-disable per-line |

---

## 12. Pointers

- Live agent: `~/.claude/agents/idea-to-app.md`
- Project memory index: `memory/MEMORY.md`
- Diary: `memory/diary.md` (append per session)
- Security patterns (cross-project): `~/.claude/projects/-Users-rohit-Downloads-ClaudeCodeProject/memory/project_tadaaaa_security_patterns.md`
- Hallmark skill: `~/.claude/skills/hallmark/`
- Handoff (latest): `HANDOFF.md`

End. Reuse aggressively.
