# TaDaaaa — Full Runbook

**From a bare laptop to both apps running.** Web (Next.js) + Mobile (Expo/React Native).

Every command and every number below was executed and verified on **2026-10-04**,
macOS (Darwin 25.6.0), Node **v22.22.2**, npm **10.9.7**.

| | |
|---|---|
| **Branch to run (web)** | **`snapshot/complete-2026-10-04`** |
| **Branch to run (mobile)** | **`mobile-app`** |
| **Repo** | `https://github.com/rohita7333-maker/Tadaaa.git` (both apps, one remote) |
| **Database** | Hosted Supabase — already migrated, nothing to install or run |
| **Time** | ~15 min web, ~10 min mobile, mostly `npm install` |

---

## 0. TL;DR — the whole thing in 10 commands

```bash
nvm install 22 && nvm use 22

# Web
git clone -b snapshot/complete-2026-10-04 https://github.com/rohita7333-maker/Tadaaa.git tadaaaa/surprise-invite
cd tadaaaa/surprise-invite
npm install
cp .env.example .env.local     # then paste real secrets in — see §4.4
npm run dev                    # http://localhost:3000

# Mobile (NEW terminal, separate clone)
git clone -b mobile-app https://github.com/rohita7333-maker/Tadaaa.git tadaaaa/mobile
cd tadaaaa/mobile
npm install --legacy-peer-deps
npx expo start --lan           # then update .env with your LAN IP — see §5.3
```

If you only have time for one: do the **web** half. Mobile depends on it being up.

---

## 1. Mental model — read this before you clone anything

Three facts explain nearly every mistake people make with this project.

### 1.1 There are two separate git repos sharing one GitHub remote

They are **not** nested. Cloning the web branch does **not** give you the mobile app —
verified: `git ls-tree -r snapshot/complete-2026-10-04 | grep "^mobile/"` returns **0 files**.

You clone the same URL **twice**, at two different branches, into two sibling folders:

```
tadaaaa/                             ← just a folder. NOT a git repo.
├── surprise-invite/                 ← clone #1 · branch snapshot/complete-2026-10-04
│   ├── src/  sql/  public/
│   ├── package.json                 (Next.js 16.2.12 · React 19.2.4)
│   └── .env.local                   ← you create this. gitignored.
│
└── mobile/                          ← clone #2 · branch mobile-app
    ├── src/app/                     (expo-router routes live HERE, not /app)
    ├── package.json                 (Expo ~54 · React Native 0.81.5)
    └── .env                         ← you create this. gitignored.
```

> The folder names are yours to pick. The **branches** are not.

### 1.2 One hosted database, shared by everything

Both apps — and both laptops — talk to the **same** hosted Supabase project.
There is no local Postgres, no Docker, no seed step, and **no migration to run**.
All 29 files in `sql/` are already applied. See §7.

Consequence: anything you create or delete on the new laptop is immediately visible
on the old one. There is no separate dev database to hide in.

### 1.3 Secrets never travel through git

`.gitignore` contains `.env*` with `!.env.example`. So `.env.local` (web) and `.env`
(mobile) exist on your old laptop and **nowhere in the repo**. Moving them across is
the one genuinely manual step in this guide.

---

## 2. Which branch? — the definitive answer

### Web: `snapshot/complete-2026-10-04`

```bash
git checkout snapshot/complete-2026-10-04
```

This is the only branch with the complete current app. **`main` is stale** — do not run it.

### Mobile: `mobile-app`

```bash
git checkout mobile-app
```

### Full branch map

| Branch | Contents | Run it? |
|---|---|---|
| **`snapshot/complete-2026-10-04`** | **The web app.** Pine theme, live preview, music, video recorder, analytics dashboard, configurable dodge, circle photo reveal. `feat/wizard-trio` + `fix/creator-preview-stats` merged | ✅ **Yes — web** |
| **`mobile-app`** | **The Expo app.** 29 frames, auth, tabs, create wizard, full reveal | ✅ **Yes — mobile** |
| `feat/wizard-trio` | Same web app minus the creator-preview-stats fix | Fallback only |
| `fix/creator-preview-stats` | The fix alone, already merged into the snapshot | No |
| `retheme/pine` | The pine re-skin alone, without wizard features | No |
| `backup/sophistication-2026-10-04` | Archive of the old warm/Bricolage re-skin + ops work (Sentry, PostHog, GDPR export, audit log) | Reference |
| `feat/sophistication` | Same as above but **cannot be pushed to** without the `workflow` OAuth scope | Reference |
| `feat/templates` | Older base — still the **warm rose/gold** theme | No |
| `feat/mobile-bff` | Backend-for-frontend commit, superseded | No |
| `preview/editorial` | Abandoned alternative editorial design | No |
| `main` | **Stale.** Months behind | ❌ No |

> **Why these aren't all merged into one branch:** `preview/editorial`,
> `feat/sophistication`, and the snapshot are three *mutually exclusive theme
> implementations*. `preview/editorial` conflicts across 73 files. Merging them
> produces a branch that does not run. Each is preserved intact on GitHub instead.

### How to tell instantly if you're on the right web branch

Load `http://localhost:3000` and look at the colour:

| What you see | Branch |
|---|---|
| Deep green `#3E6B5C`, off-white `#FAF9F6`, Figtree type | ✅ Pine — correct |
| Rose / gold, Bricolage Grotesque type | ❌ Wrong branch — go back to §2 |

---

## 3. Prerequisites

### 3.1 Required for both apps

```bash
# Node 22 — .nvmrc pins "22"
nvm install 22 && nvm use 22
node -v          # must print v22.x  (Next 16 requires >= 20.9.0)
npm -v           # 10.x

git --version
```

> **Why pin it:** `package.json` has **no `engines` field**, so npm will *not* stop you
> installing on Node 18 — it will install happily and then fail at runtime with opaque
> errors. The `.nvmrc` is the only guard. Honour it.

Use **npm**. Only `package-lock.json` is committed — yarn or pnpm will resolve a
different tree.

Not required: Homebrew packages, Docker, local Postgres, Supabase CLI.

### 3.2 Additional, for mobile only

| Target | What you need |
|---|---|
| **Physical phone** (easiest) | **Expo Go** from the App Store / Play Store. Phone must be on the **same Wi-Fi** as the laptop |
| iOS Simulator | Xcode + `xcode-select --install`, then one simulator installed |
| Android Emulator | Android Studio + one AVD created |

Expo CLI itself needs no global install — `npx expo` uses the local copy.

---

# PART A — The web app

## 4.1 Clone

```bash
mkdir -p ~/Projects/tadaaaa && cd ~/Projects/tadaaaa
git clone -b snapshot/complete-2026-10-04 https://github.com/rohita7333-maker/Tadaaa.git surprise-invite
cd surprise-invite
```

Confirm:

```bash
git branch --show-current       # → snapshot/complete-2026-10-04
```

## 4.2 Install dependencies

```bash
npm install
```

Takes a few minutes. Expect warnings; expect **no errors**. If it errors, see §9.

## 4.3 Create `.env.local`

```bash
cp .env.example .env.local
```

### Moving the real values across

The safest route is to copy `.env.local` **directly off the old laptop** — AirDrop, a
USB stick, or a password-manager secure note. Do not paste secrets into chat, email,
Slack, or a terminal that logs history.

To see which keys you need without exposing any value:

```bash
# Run this ON THE OLD LAPTOP
sed -E 's/=.*/=<hidden>/' .env.local
```

### 4.4 What every key does

**Required — the app will not boot correctly without these five:**

| Key | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page — the *anon / publishable* key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page — **server-only secret. Never exposed to the browser** |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |

**Feature keys — app boots without them, but that feature is dead:**

| Key(s) | What breaks when missing |
|---|---|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Premium themes, checkout |
| `STRIPE_GIFT_PRICE_ID` | **Gifting.** Checkout logs `[gift] STRIPE_GIFT_PRICE_ID not configured` and refuses |
| `ANTHROPIC_API_KEY` | "Draft with AI" in the create wizard |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | All outbound email (first-view notification, digests) |
| `SIGHTENGINE_API_USER`, `SIGHTENGINE_API_SECRET` | Photo moderation on publish (**fails open** — publishing still works) |
| `CRON_SECRET` | `/api/cron/*` rejects every call |

**Optional — observability. Safe to leave blank locally:**

`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
`SENTRY_PROJECT`, `POSTHOG_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_HOST`,
`NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`

> Sentry no-ops unless `NODE_ENV=production`, so blank is correct for local dev.

## 4.5 Run it

```bash
npm run dev
```

Open **http://localhost:3000**.

> ### Use `localhost:3000`, never `127.0.0.1:3000`
> They are different origins to both the browser and Supabase. The auth redirect
> allow-list and the mobile app's API origin are both registered against
> `localhost:3000`. Using `127.0.0.1` silently breaks sign-in.

> ### Port 3000 is not negotiable
> It is the web app *and* the origin the mobile app calls. See §9 if it's occupied.

## 4.6 Verify the install — the three real gates

Run all three. These are the project's actual baselines; **they must not regress.**

```bash
npx tsc --noEmit      # expect: no output, exit 0
npm test              # expect: Test Files 46 passed (46) / Tests 533 passed (533)
npm run build         # expect: ✓ Compiled successfully
```

Measured on 2026-10-04:

```
TSC_EXIT=0

 Test Files  46 passed (46)
      Tests  533 passed (533)
   Duration  1.43s
```

Fewer than 533 tests means the install is incomplete:

```bash
rm -rf node_modules package-lock.json && npm install
```

> **Never run `npm run build` while `npm run dev` is live.** The build rewrites `.next/`
> underneath the running server and dev starts serving broken chunks. Stop dev first.

## 4.7 Click-through smoke test

1. **`/`** → landing page in the **pine** theme (deep green, off-white, Figtree).
2. **Sign in** → `/dashboard` lists your surprises.
3. **`/dashboard/analytics`** → per-invite stats, 7-day view chart, funnel, reaction mix.
4. **`/create`** → wizard runs: occasion → details → photos → questions → preview.
5. **Open a published surprise link in a private window** → tap through to the photo reveal.
   Use a private window: *your own opens are deliberately not counted*, so a normal
   window will not move the view counter and you'll think logging is broken.

---

# PART B — The mobile app

## 5.1 Clone it separately

This is the step the old `SETUP.md` got wrong. `mobile/` is **not** inside the web
branch. You need a second clone:

```bash
cd ~/Projects/tadaaaa                      # the parent folder, NOT surprise-invite
git clone -b mobile-app https://github.com/rohita7333-maker/Tadaaa.git mobile
cd mobile
git branch --show-current                  # → mobile-app
```

## 5.2 Install — `--legacy-peer-deps` is mandatory

```bash
npm install --legacy-peer-deps
```

Plain `npm install` **fails**. Verified:

```
npm error Could not resolve dependency:
npm error peer react@"^19.2.3" from @react-native/jest-preset@0.86.0
npm error Conflicting peer dependency: react@19.3.0
```

The conflict is cosmetic — `@react-native/jest-preset` declares a narrower React range
than the one Expo 54 ships. `--legacy-peer-deps` is the correct resolution here, and
the test suite passes under it (§5.6).

## 5.3 Create `.env` — the LAN IP is the gotcha

```bash
cp .env.example .env
```

Four keys:

| Key | Value |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Same Supabase URL as the web app |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same anon key as the web app |
| `EXPO_PUBLIC_API_BASE_URL` | **`http://<your-laptop-LAN-IP>:3000`** |
| `EXPO_PUBLIC_SITE_URL` | Same LAN URL — used to build `/surprise/[slug]` links |

> ### ⚠️ Never put `SUPABASE_SERVICE_ROLE_KEY` in `mobile/.env`
> Everything prefixed `EXPO_PUBLIC_` is **bundled into the app binary** and readable by
> anyone who downloads it. The anon key is safe there — it is public by design and
> RLS-protected. The service-role key bypasses RLS entirely. It belongs only in the
> web app's server-side `.env.local`. Secret-key operations (AI draft, Stripe checkout,
> photo moderation) are why the mobile app calls the web backend at all.

Find your LAN IP:

```bash
ipconfig getifaddr en0          # Wi-Fi.  Try en1 if en0 is empty
```

Then set, for example:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:3000
EXPO_PUBLIC_SITE_URL=http://192.168.1.42:3000
```

**`localhost` will not work here.** On a physical phone `localhost` means *the phone*,
not your laptop. This IP also changes whenever you join a different network — if the
app suddenly can't reach the backend, re-run `ipconfig getifaddr en0` first.

## 5.4 Start the web app first

The mobile app calls the web backend. In a **separate terminal**:

```bash
cd ~/Projects/tadaaaa/surprise-invite && npm run dev
```

Leave it running.

## 5.5 Start Expo

```bash
cd ~/Projects/tadaaaa/mobile
npx expo start --lan
```

Then pick your target:

| Target | How |
|---|---|
| **Physical phone** | Scan the QR code with **Expo Go**. Same Wi-Fi as the laptop |
| iOS Simulator | Press `i` in the Expo terminal, or `npm run ios` |
| Android Emulator | Press `a` in the Expo terminal, or `npm run android` |
| Browser (limited) | Press `w`, or `npm run web` |

> Use `--lan`, not `--tunnel`. Tunnel mode routes through Expo's servers and cannot
> reach `http://192.168.x.x:3000` on your private network.

The app's deep-link scheme is **`tadaaaa`** (e.g. `tadaaaa://surprise/<slug>`).

## 5.6 Verify mobile

```bash
npm run typecheck     # expect: no output
npm test              # expect: Test Suites 49 passed / Tests 618 passed
```

Measured on 2026-10-04:

```
Test Suites: 49 passed, 49 total
Tests:       618 passed, 618 total
Time:        3.361 s
```

---

# PART C — Running the whole system

Two terminals, in this order:

```
Terminal 1                                Terminal 2
──────────────────────────                ──────────────────────────
cd tadaaaa/surprise-invite                cd tadaaaa/mobile
npm run dev                               npx expo start --lan
  ↓                                         ↓
localhost:3000                            Expo Go on your phone
```

How the pieces talk:

```
  ┌─────────────────┐          ┌──────────────────┐
  │  Browser        │          │  Phone (Expo Go) │
  │  localhost:3000 │          │                  │
  └────────┬────────┘          └────────┬─────────┘
           │                            │
           │                            │  EXPO_PUBLIC_API_BASE_URL
           │                            │  http://<LAN-IP>:3000
           │                            │  (AI draft · Stripe · moderation)
           ▼                            ▼
  ┌──────────────────────────────────────────────┐
  │   Next.js app  ·  localhost:3000             │
  │   holds SUPABASE_SERVICE_ROLE_KEY            │
  └───────────────────────┬──────────────────────┘
                          │
       ┌──────────────────┴───────────────────┐
       │                                      │
       ▼                                      ▼
┌──────────────┐                    ┌──────────────────┐
│ Hosted       │◄───────────────────┤ Phone, direct    │
│ Supabase     │   anon key + RLS   │ reads/writes     │
│ (shared DB + │                    └──────────────────┘
│  Storage)    │
└──────────────┘
```

The phone reads and writes most data **directly** against Supabase with the anon key
under RLS. It only routes through the web backend for operations that need the
service-role key.

---

## 7. The database — hands off

**Do not run anything in `sql/`.** All 29 files are already applied to the hosted
Supabase project. The new laptop connects to that same project. Nothing in this guide
creates or alters a table.

For reference only, `sql/` contains (newest work last): `increment_view_count`,
`invite_status`, `rate_limits`, `subscription_tier`, `stripe_customers`,
`stripe_events`, `premium_enforcement`, `public_rpc_security`, `account_audit`,
`ai_drafts`, `invite_contributions`, `invite_rsvps`, `rsvp_name`,
`invite_session_unique`, `profile_notify_columns`, `profiles_welcomed_at`,
`free_tier_expiry`, `gift_purchases`, `push_tokens`, `mobile_handoff_phase0`,
`invite_read_lockdown`, `scroll_story_events`, `invite_reveal_type_scroll_story`,
`P4_migrations`, `rate_limits_anon_rpc`, `wizard_trio`, `dodge_limit`,
`PENDING_invite_events`, `ALL_MIGRATIONS`.

Storage bucket: **`invite-photos`**. Uploads land under `pending/` and are promoted on
publish — which is why a missing `SUPABASE_SERVICE_ROLE_KEY` shows up as *"photos
uploaded but the reveal is empty."*

Scheduled jobs (Vercel only, from `vercel.json` — they do **not** run locally):

| Path | Schedule |
|---|---|
| `/api/cron/expire-invites` | `0 3 * * *` (03:00 UTC) |
| `/api/cron/purge-deleted` | `0 4 * * *` (04:00 UTC) |

---

## 8. Command cheat sheet

### Web — `tadaaaa/surprise-invite`

| Command | What it does |
|---|---|
| `npm run dev` | Dev server, Turbopack, `localhost:3000` |
| `npm run build` | Production build. **Stop dev first** |
| `npm start` | Serve the production build |
| `npm test` | Vitest once — 46 files / 533 tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |

### Mobile — `tadaaaa/mobile`

| Command | What it does |
|---|---|
| `npx expo start --lan` | Dev server + QR code |
| `npm run ios` | Boot in the iOS Simulator |
| `npm run android` | Boot in the Android Emulator |
| `npm run web` | Expo web build |
| `npm test` | Jest — 49 suites / 618 tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |

---

## 9. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Landing page is **rose/gold**, not green | Wrong branch. `git checkout snapshot/complete-2026-10-04` |
| `Invalid supabase URL`, or middleware throws on every route | `.env.local` missing, or still holds `.env.example` placeholders |
| Sign-in bounces straight back to sign-in | `http://localhost:3000` is not in the Supabase redirect allow-list → Dashboard → Authentication → URL Configuration. (Email/password works regardless; this only hits OAuth) |
| You used `127.0.0.1:3000` | Different origin → auth fails. Use `localhost:3000` |
| Photos upload, reveal shows none | `SUPABASE_SERVICE_ROLE_KEY` missing — files stay in `pending/` and are never promoted |
| Gift checkout refuses, logs `[gift] STRIPE_GIFT_PRICE_ID not configured` | Add `STRIPE_GIFT_PRICE_ID` to `.env.local` |
| View counter never moves when you open your own link | **Working as designed.** Creator previews are excluded. Test in a private window |
| Tests pass but pages 500 | Stale build cache: `rm -rf .next && npm run dev` |
| Dev server serves broken JS chunks | You ran `npm run build` while `npm run dev` was live. Stop both, `rm -rf .next`, restart dev |
| `npm test` reports fewer than 533 | Incomplete install: `rm -rf node_modules package-lock.json && npm install` |
| Port 3000 already in use | See the block below |
| Mobile: `npm install` ERESOLVE on `react@19.3.0` | Expected. Use `npm install --legacy-peer-deps` |
| Mobile: "Network request failed" on every API call | `EXPO_PUBLIC_API_BASE_URL` is `localhost` or a stale IP. Re-run `ipconfig getifaddr en0` and update `.env` |
| Mobile: QR code scans but nothing loads | Phone is on a different Wi-Fi network, or you used `--tunnel` instead of `--lan` |
| Mobile: changed `.env` but the app ignores it | `EXPO_PUBLIC_*` vars are baked at bundle time. Stop Expo and restart with `npx expo start --lan --clear` |

### Freeing port 3000 safely

A dead `npx` wrapper can leave a wedged `next-server` holding the port. **Confirm what
it is before killing it:**

```bash
lsof -ti:3000                       # get the PID
lsof -a -p <PID> -d cwd -Fn         # confirm its working directory
kill <PID>
```

---

## 10. Known gaps and risks

**MEDIUM — secrets are manual.** `.env.local` and `mobile/.env` are correctly gitignored
and therefore do not travel with the clone. You must move them across by hand (§4.3).
This is the single most likely reason a fresh setup fails.

**MEDIUM — one shared production database.** There is no separate dev database. Test
data you create on the new laptop is real data on the same Supabase project the old
laptop uses. Prefer a throwaway account for experiments.

**LOW — `STRIPE_GIFT_PRICE_ID` was missing from `.env.example`.** It is read by
`src/app/api/stripe/checkout/route.ts:46`. Documented in §4.4 and added to
`.env.example` alongside this runbook.

**LOW — Node version is unenforced.** `package.json` has no `engines` field, so npm will
not block an install on Node 18. `.nvmrc` (pinned to `22`) is the only guard, and it only
applies if you actually run `nvm use`.

**LOW — the mobile LAN IP is environment-specific.** `EXPO_PUBLIC_API_BASE_URL` must be
re-pointed every time the laptop changes network. There is no auto-discovery.

**LOW — the Supabase keep-alive CI workflow is archived, not active.** Pushing
`.github/workflows/supabase-keepalive.yml` needs the `workflow` OAuth scope, which the
current token lacks. Its content is preserved at `docs/ci/supabase-keepalive.yml.txt`.
To restore: `gh auth refresh -s workflow`, copy the file back to `.github/workflows/`,
push. Until then a Supabase free-tier project can auto-pause after ~7 idle days.

**LOW — mobile is a paused workstream.** The Expo app builds, typechecks, and passes 618
tests, but it is not under active development and has not been device-verified in this
cycle. Treat it as a working snapshot, not a shipping product.

**NOT VERIFIED — this runbook was validated on the machine that already has the project.**
Every command, version, and test count is real output from this laptop, but the
end-to-end path *on a genuinely clean machine* (fresh `nvm`, empty npm cache, no
`node_modules`) has not been executed. The clone and branch facts were checked against
the remote's git tree rather than the local filesystem, which is what caught the
`cd tadaaaa/mobile` error in the previous `SETUP.md`.
