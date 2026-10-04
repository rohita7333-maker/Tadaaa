# Running TaDaaaa on a new laptop

Everything needed to go from a bare machine to the app running at
`http://localhost:3000`. Verified on macOS 2026-10-04 against Node v22.22.2 /
npm 10.9.7.

**Time:** ~10 minutes, most of it `npm install`.

> Want the complete version — mobile app, architecture diagram, command cheat
> sheet, full troubleshooting? See **[RUNBOOK.md](RUNBOOK.md)**. This file is the
> web-only quick start.

---

## 0. What you are setting up

| | |
|---|---|
| App | Next.js **16.2.12** (App Router, Turbopack) + React 19.2.4 |
| Database | **Hosted Supabase** — shared with this machine, nothing to install or migrate |
| Package manager | **npm** (`package-lock.json` is the lockfile — do not use yarn/pnpm) |
| Node | **≥ 20.9.0** required by Next 16. `.nvmrc` pins **22** |
| Branch to run | **`snapshot/complete-2026-10-04`** — the complete current app, *not* `main` |

> The database is a hosted Supabase project. The new laptop talks to the **same**
> database as this one. You do **not** run anything from `sql/` — all 29 migrations
> are already applied. Nothing in Step 1–6 creates or alters a table.

---

## 1. Install prerequisites

```bash
# Node 22 (nvm is the easiest route; .nvmrc pins 22)
nvm install 22 && nvm use 22

# Verify — must be >= 20.9.0
node -v
npm -v
```

No Homebrew packages, no Docker, no local Postgres required.

---

## 2. Clone the repo

```bash
git clone https://github.com/rohita7333-maker/Tadaaa.git tadaaaa
cd tadaaaa
```

## 3. Check out the right branch

This is the step people get wrong. `main` is **not** the current app.

```bash
git checkout snapshot/complete-2026-10-04
```

Branch map, so you know what you are looking at:

| Branch | What it is |
|---|---|
| **`snapshot/complete-2026-10-04`** | **Run this.** Everything mergeable in one branch: pine theme, live preview, music, video recorder, analytics, creator-preview fix |
| `feat/wizard-trio` | Same app, minus the creator-preview fix |
| `backup/sophistication-2026-10-04` | Archive of the old warm/Bricolage re-skin + mobile BFF. Not runnable alongside pine |
| `retheme/pine` | The pine re-skin alone, without the wizard features |
| `feat/templates` | Older base — still the *warm* rose/gold theme |
| `preview/editorial` | Abandoned alternative design. Reference only |
| `main` | Stale |

## 4. Install dependencies

```bash
npm install
```

Use `npm`, not yarn or pnpm — only `package-lock.json` is committed.

---

## 5. Create `.env.local` — the one manual step

Secrets are **not** in the repo (`.gitignore` excludes `.env*` except
`.env.example`). You must copy them across yourself.

```bash
cp .env.example .env.local
```

Then fill in every value. **The fastest and safest way to move them** is to copy
`.env.local` directly off the old laptop — AirDrop, a USB stick, or your password
manager's secure note. Do not paste secrets into chat, email, or Slack.

```bash
# On the OLD laptop — see the key names without exposing values:
sed -E 's/=.*/=<hidden>/' .env.local
```

### What each key is for

**Required — the app will not work without these:**

| Key | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page — the *anon/publishable* key |
| `SUPABASE_SERVICE_ROLE_KEY` | same page — **server-only secret, never ships to the browser** |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local |

**Feature keys — the app boots without them, but that feature is dead:**

| Key(s) | Feature that breaks if missing |
|---|---|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Premium themes, checkout, gifting |
| `ANTHROPIC_API_KEY` | "Draft with AI" in the create wizard |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | All outbound email (first-view notification, digests) |
| `SIGHTENGINE_API_USER`, `SIGHTENGINE_API_SECRET` | Photo moderation on publish |
| `CRON_SECRET` | Cron routes (`/api/cron/*`) reject calls without it |

**Optional — observability. Safe to leave blank locally:**

`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
`SENTRY_PROJECT`, `POSTHOG_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`,
`NEXT_PUBLIC_POSTHOG_HOST`

---

## 6. Run it

```bash
npm run dev
```

Open **http://localhost:3000**.

> Use `localhost:3000` exactly — not `127.0.0.1:3000`. Supabase auth redirects and
> the mobile BFF origin are both registered against `localhost:3000`, and
> `127.0.0.1` is a different origin as far as the browser and Supabase are concerned.

---

## 7. Verify the install is actually good

Run all three. They are the project's real gates.

```bash
npx tsc --noEmit     # expect: no output, exit 0
npm test             # expect: 46 files, 533 tests passed
npm run build        # expect: ✓ Compiled successfully
```

If `npm test` reports fewer than 533, something did not install cleanly — delete
`node_modules` and `package-lock.json`, then `npm install` again.

### Click-through smoke test

1. `http://localhost:3000` → landing page renders in the pine theme (deep green
   `#3E6B5C`, Figtree type, off-white `#FAF9F6` background). If it is rose/gold,
   you are on the wrong branch — go back to Step 3.
2. Sign in → `/dashboard` loads with your surprises.
3. `/dashboard/analytics` → per-invite stats, 7-day chart, funnel.
4. Open any published surprise link **in a private window** → tap through to the
   photo reveal. Your own opens are deliberately not counted, so a normal window
   will not move the view counter.

---

## Other laptop, same person: things that will bite you

**Auth redirects.** Google sign-in only works if `http://localhost:3000` is in the
Supabase redirect allow-list (Dashboard → Authentication → URL Configuration).
Email/password sign-in works regardless.

**You share one database.** Anything you create, delete, or publish on the new
laptop hits the same rows the old laptop sees. There is no separate dev database.

**Port 3000 specifically.** It is both the web app and the origin the mobile app
calls. If something else is already on 3000:

```bash
lsof -ti:3000                       # find the PID
lsof -a -p <PID> -d cwd -Fn         # confirm what it is before killing
kill <PID>
```

**Never run `npm run build` while `npm run dev` is live** — the build rewrites
`.next/` underneath the running server and the dev server starts serving broken
chunks. Stop dev first.

---

## Running the mobile app too (optional)

The Expo app is a **separate git repo** on the same GitHub remote, under the branch
`mobile-app`. It is **not** a folder inside this branch — you clone the repo a second
time, as a sibling:

```bash
cd ..                               # the PARENT folder, not the web checkout
git clone -b mobile-app https://github.com/rohita7333-maker/Tadaaa.git mobile
cd mobile
npm install --legacy-peer-deps      # plain `npm install` fails on a known peer conflict
cp .env.example .env                # then set EXPO_PUBLIC_API_BASE_URL to your LAN IP
npx expo start --lan
```

`EXPO_PUBLIC_API_BASE_URL` must be `http://<your-laptop-LAN-IP>:3000` — not
`localhost`, which on a phone means the phone. Find it with `ipconfig getifaddr en0`.

**Full mobile instructions, including simulators and troubleshooting, are in
[RUNBOOK.md](RUNBOOK.md) Part B.**

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Landing page is rose/gold, not green | Wrong branch. `git checkout feat/wizard-trio` |
| `Invalid supabase URL` / middleware error | `.env.local` missing or still has placeholder values |
| Sign-in bounces back to the sign-in page | `localhost:3000` not in Supabase redirect allow-list |
| Photos upload but the reveal shows none | Service role key missing — uploads land in `pending/` and never move |
| Tests pass but the page 500s | Stale `.next/` — `rm -rf .next && npm run dev` |
| `npm install` peer-dependency errors in `mobile/` | Expected. Use `--legacy-peer-deps` |
