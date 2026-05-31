# PLAN — Free-Tier Expiry (Model B) + Soft Delete

**Branch:** `feat/sophistication`
**Owner:** principal-dev (sonnet) · **Gate:** tadaaaa-ceo
**Status:** APPROVED — ready to execute. Nothing touched yet.

## Goal
Close free-tier delete-to-bypass revenue leak. Quota governed by **time**, not count.
Free surprises expire 28 days after reveal → greyed out. Paid = forever.
All delete becomes **soft** (recoverable, analytics-preserving, GDPR-purged later).

---

## Locked decisions
| Item | Decision |
|------|----------|
| Free expiry | 28 days after **reveal** (first view) |
| Trigger | First recipient view stamps `revealed_at` + `expires_at = reveal + 28d` |
| Expired UX | Greyed-out card in dashboard + expired screen w/ "make your own free" CTA (already exists) |
| Creator notice | Message at create + dashboard: free = 28-day life, upgrade = forever |
| Free delete | Allowed **only after expired** |
| Delete type | **Soft** for everyone (`deleted_at`), consistent |
| Purge | Cron hard-purges storage + row **30 days** after `deleted_at` (GDPR) |
| Paid | No expiry set. Lives forever. |

---

## Current state (verified read-only)
- `invites.expires_at` exists, honored by surprise page + `isExpired()` + InviteCard.
- `invites.status` + `is_active` split-brain; cron `expire-invites` keeps in sync.
- Cron `expire-invites/route.ts` already sets `status=expired,is_active=false` when `expires_at` past. **Reuse as-is.**
- `increment_view_count(invite_id)` RPC returns new count; first view = 1. **Reveal hook.**
- Count quota: `invite.ts:60` — still needed as backstop but timer is primary gate.
- MISSING: `revealed_at`, `deleted_at` columns. `deleteInvite` is HARD delete.

---

## Phase 1 — DB migration (SQL)
New file `sql/free_tier_expiry.sql`:
1. `ALTER TABLE invites ADD COLUMN revealed_at TIMESTAMPTZ;`
2. `ALTER TABLE invites ADD COLUMN deleted_at TIMESTAMPTZ;`
3. Partial index: `CREATE INDEX idx_invites_deleted_at ON invites (deleted_at) WHERE deleted_at IS NOT NULL;`
4. Index for purge cron: `CREATE INDEX idx_invites_revealed_at ON invites (revealed_at) WHERE revealed_at IS NOT NULL;`
5. Update `increment_view_count` RPC: on first view (count becomes 1), if invite is free-tier set `revealed_at = NOW()` and `expires_at = NOW() + INTERVAL '28 days'` (only if `expires_at` currently NULL). Free-tier check = join profiles subscription_tier. Keep SECURITY DEFINER + anon grant.
   - Alt if RPC join messy: do reveal-stamp in a separate `mark_revealed(invite_id)` RPC called from view path.
- Append to `sql/ALL_MIGRATIONS.sql`.
- Apply via Supabase MCP (`apply_migration`).

**Verify:** new invite → publish → open as recipient → `revealed_at` set + `expires_at` = +28d. Paid invite → open → `expires_at` stays NULL.

## Phase 2 — Reveal stamping (read path)
File: wherever `increment_view_count` called (surprise view path — `src/lib/invite-view.ts` / `[slug]/page.tsx`).
- If RPC handles it (Phase 1.5) → no app change.
- Confirm tier resolved server-side; never trust client.

## Phase 3 — Soft delete
File: `src/actions/invite.ts` `deleteInvite` (line 351).
- Replace `.delete()` with `.update({ deleted_at: NOW, is_active: false, status: 'deleted' })`.
- **Do NOT** purge storage here — defer to cron.
- Free-tier guard: if `tier==='free'` AND not expired → return `{ error: "Free surprises can be deleted after they expire (28 days after reveal). Upgrade to delete anytime." }`.
- Paid → soft delete anytime.

## Phase 4 — Hide soft-deleted everywhere (reads)
Add `.is("deleted_at", null)` to all invite reads:
- `src/app/dashboard/page.tsx`
- `src/lib/invite-view.ts` (`getInviteBySlug`)
- `src/actions/invite.ts` list/get paths
- count query `invite.ts:60` (don't count deleted)
- any RPC reading invites for public (record_answer, increment_view_count — treat deleted as not_found/unavailable)
**Critical:** miss one = ghost data leak. Grep `from("invites")` exhaustively.

## Phase 5 — Purge cron (GDPR)
New `src/app/api/cron/purge-deleted/route.ts` (clone `expire-invites` auth pattern):
- Select invites `deleted_at < NOW() - 30 days`.
- Remove storage (photos + video) via admin client.
- Hard `.delete()` row.
- Register in `vercel.json` cron schedule (daily).

## Phase 6 — Creator messaging (UI)
- Create flow (`src/app/create/page.tsx` / QuestionBuilder area): note "Free surprises stay live 28 days after reveal. Upgrade to keep forever 💝".
- Dashboard expired card: ensure CTA "Upgrade to restore / keep forever".
- Reword require-answer toggle helper (Decision #2 from earlier — "Require answer to continue" + helper text "If on, they can't skip — good for RSVPs"). File `src/components/create/QuestionBuilder.tsx:133`.

## Phase 7 — Tests
- `tier.test.ts` — extend if quota logic touched.
- New: reveal stamps expiry for free, not paid.
- New: soft delete sets deleted_at, hides from reads, free-blocked-when-live.
- New: purge cron only touches >30d deleted.
- `tsc` clean + existing suite green.

## Phase 8 — Verify + commit
- Manual: full flow free vs paid (create→publish→reveal→expire→delete→purge).
- `webapp-testing` / Playwright on dashboard + surprise pages.
- security-review: deleted invites unreachable via slug/RPC.
- `caveman-commit`. No push unless asked.

---

## Risk register
| Risk | Mitigation |
|------|-----------|
| Miss a read path → deleted invite still public | Exhaustive grep `from("invites")`, add `.is("deleted_at",null)` |
| RPC tier join slow on hot view path | Cache / separate mark_revealed RPC; index revealed_at |
| Existing live free invites have no expires_at | Backfill: optional one-time — set expires_at for already-revealed free invites, or grandfather (no expiry). DECIDE. |
| Recipient mid-view when expiry hits | Acceptable; expired screen on next load |
| Paid downgrade → forever invites suddenly free | Out of scope; revisit when subscription churn handled |

## Open item for CEO before code
- **Backfill existing free invites?** Grandfather (leave forever) OR set expires_at = now+28d for already-revealed free ones. Recommend grandfather (avoid surprise expiry on live users).
