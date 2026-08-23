/**
 * schema-adapter — the ONLY place the mobile handoff's vocabulary meets the
 * production schema.
 *
 * WHY THIS EXISTS
 *
 * `design_handoff_tadaaaa_mobile/README.md` specifies a data model derived from
 * the web PROTOTYPE's state object, not from the real database. The two describe
 * the same product in different words:
 *
 *   handoff              production
 *   surprises            invites
 *   owner                creator_id
 *   occasion             occasion_type
 *   reveal_style         reveal_type          ('scroll' vs 'scroll_story')
 *   dodging_no           enable_dodge_no
 *   contributions_open   accept_contributions
 *   scheduled_at         countdown_date
 *   timezone             display_timezone
 *   surprise_photos      invite_photos        (position vs sort_order)
 *   contributions        invite_contributions (status enum vs approved bool)
 *   profiles.tier        profiles.subscription_tier
 *   profiles.onboarded   profiles.welcomed_at (timestamp, not boolean)
 *
 * `CLAUDE_CODE_PROMPT.md` forbids redesigning the mobile spec. The standing
 * project rule forbids renaming or dropping anything in production, which the
 * live web app depends on across ~60 files. An adapter is the only thing that
 * satisfies both at once.
 *
 * THE RULE: production column names live here and nowhere else in the mobile
 * app. Screens speak the handoff's language; this module does the translating.
 */

// ---------------------------------------------------------------------------
// Reveal style
// ---------------------------------------------------------------------------

/** Handoff style -> production `reveal_type`. The one outright disagreement. */
export const REVEAL_STYLE_MAP = {
  scroll: "scroll_story",
  tap: "tap",
  countdown: "countdown",
  letters: "letters",
} as const;

export type RevealStyle = keyof typeof REVEAL_STYLE_MAP;
export type RevealType = (typeof REVEAL_STYLE_MAP)[RevealStyle];

const REVEAL_TYPE_MAP = Object.fromEntries(
  Object.entries(REVEAL_STYLE_MAP).map(([style, type]) => [type, style]),
) as Record<string, RevealStyle>;

export function toRevealType(style: RevealStyle): RevealType {
  return REVEAL_STYLE_MAP[style];
}

/**
 * Production `reveal_type` -> handoff style.
 *
 * Falls back to `tap` rather than throwing: `reveal_type` is TEXT with a CHECK,
 * so a value added server-side before the app ships would otherwise blank a
 * recipient's reveal entirely. Tap is the safest default — it renders with
 * nothing but a title and a message.
 */
export function toRevealStyle(type: string): RevealStyle {
  return REVEAL_TYPE_MAP[type] ?? "tap";
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type HandoffStatus = "draft" | "scheduled" | "live" | "expired";

/**
 * Production has no single status field the app reads. Lifecycle is computed
 * from `deleted_at` + `expires_at` + `is_active` + `countdown_date`, and this
 * mirrors `deriveInviteStatus`'s precedence exactly so both platforms label a
 * row the same way.
 *
 * (`invites.status` exists as a trigger-maintained column but nothing reads it,
 * deliberately — see the P2 note in project memory.)
 */
export function deriveHandoffStatus(row: {
  deleted_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean | null;
  countdown_date?: string | null;
}): HandoffStatus {
  if (row.deleted_at) return "expired";
  if (row.expires_at && new Date(row.expires_at) < new Date()) return "expired";
  if (row.is_active !== true) return "draft";
  if (row.countdown_date && new Date(row.countdown_date) > new Date()) return "scheduled";
  return "live";
}

// ---------------------------------------------------------------------------
// Surprise (production: invites)
// ---------------------------------------------------------------------------

/** The handoff's `surprises` row, as the mobile app sees it. */
export interface Surprise {
  id: string;
  owner: string;
  slug: string;
  title: string;
  occasion: string;
  revealStyle: RevealStyle;
  theme: string;
  message: string;
  dodgingNo: boolean;
  contributionsOpen: boolean;
  scheduledAt: string | null;
  timezone: string | null;
  expiresAt: string | null;
  isPremium: boolean;
  status: HandoffStatus;
  viewCount: number;
  responseCount: number;
  createdAt: string | null;
}

export interface ProductionInviteRow {
  id: string;
  creator_id: string;
  slug: string;
  title: string;
  occasion_type?: string | null;
  reveal_type?: string | null;
  theme?: string | null;
  message?: string | null;
  enable_dodge_no?: boolean | null;
  accept_contributions?: boolean | null;
  countdown_date?: string | null;
  display_timezone?: string | null;
  expires_at?: string | null;
  is_paid?: boolean | null;
  is_active?: boolean | null;
  deleted_at?: string | null;
  view_count?: number | null;
  response_count?: number | null;
  created_at?: string | null;
}

export function fromProductionInvite(row: ProductionInviteRow): Surprise {
  return {
    id: row.id,
    owner: row.creator_id,
    slug: row.slug,
    title: row.title,
    occasion: row.occasion_type ?? "custom",
    revealStyle: toRevealStyle(row.reveal_type ?? "tap"),
    theme: row.theme ?? "",
    message: row.message ?? "",
    dodgingNo: row.enable_dodge_no ?? false,
    contributionsOpen: row.accept_contributions ?? false,
    scheduledAt: row.countdown_date ?? null,
    timezone: row.display_timezone ?? null,
    expiresAt: row.expires_at ?? null,
    isPremium: row.is_paid ?? false,
    status: deriveHandoffStatus(row),
    viewCount: row.view_count ?? 0,
    responseCount: row.response_count ?? 0,
    createdAt: row.created_at ?? null,
  };
}

/**
 * Handoff shape -> a row production will actually accept.
 *
 * Deliberately emits ONLY columns that exist. PostgREST rejects an entire
 * insert when it meets one unknown key, so a stray `recipient_name` here fails
 * the whole publish with an error that points nowhere near the cause.
 *
 * Derived and server-owned fields (`status`, `view_count`, `response_count`,
 * `created_at`) are never written from the client.
 */
export function toProductionInvite(s: Surprise): Partial<ProductionInviteRow> {
  return {
    id: s.id,
    creator_id: s.owner,
    slug: s.slug,
    title: s.title,
    occasion_type: s.occasion,
    reveal_type: toRevealType(s.revealStyle),
    theme: s.theme,
    message: s.message,
    enable_dodge_no: s.dodgingNo,
    accept_contributions: s.contributionsOpen,
    countdown_date: s.scheduledAt,
    display_timezone: s.timezone,
    expires_at: s.expiresAt,
    is_paid: s.isPremium,
  };
}

// ---------------------------------------------------------------------------
// Contributions
// ---------------------------------------------------------------------------

export type ContributionStatus = "pending" | "approved" | "rejected";

export interface Contribution {
  id: string;
  surpriseId: string;
  name: string;
  message: string;
  photoPath: string | null;
  status: ContributionStatus;
  createdAt: string | null;
}

/**
 * ⚠️ KNOWN GAP, recorded so it is a decision and not a discovery.
 *
 * Production stores `approved boolean`. The handoff models three states. A
 * REJECTED contribution and a PENDING one both persist as `approved = false`,
 * so a moderator's reject is indistinguishable from "not yet looked at" after a
 * refetch — the B4 queue will show rejected items again.
 *
 * Fixing it properly needs an additive `moderation_status` column, drafted in
 * the phase-0 migration batch. Until that lands, the app holds rejections in
 * local state only.
 */
export interface ProductionContributionRow {
  id: string;
  invite_id: string;
  contributor_name?: string | null;
  message?: string | null;
  photo_url?: string | null;
  approved?: boolean | null;
  created_at?: string | null;
  /**
   * PII that production stores and every `select *` returns. Declared so the
   * fact that this adapter DROPS them is visible in the type, not an accident
   * of which keys someone happened to spread.
   */
  contributor_email?: string | null;
  visitor_hash?: string | null;
}

export function fromProductionContribution(row: ProductionContributionRow): Contribution {
  return {
    id: row.id,
    surpriseId: row.invite_id,
    name: row.contributor_name ?? "",
    message: row.message ?? "",
    photoPath: row.photo_url ?? null,
    status: row.approved ? "approved" : "pending",
    createdAt: row.created_at ?? null,
  };
}

export function toProductionContribution(c: Partial<Contribution>): {
  contributor_name?: string;
  message?: string;
  photo_url?: string | null;
  approved: boolean;
} {
  return {
    ...(c.name !== undefined ? { contributor_name: c.name } : {}),
    ...(c.message !== undefined ? { message: c.message } : {}),
    ...(c.photoPath !== undefined ? { photo_url: c.photoPath } : {}),
    approved: c.status === "approved",
  };
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export interface SurprisePhoto {
  id?: string;
  storagePath: string;
  caption?: string;
  position: number;
  /** Production-only; the handoff does not model it, the reveal renders it. */
  rotationDeg?: number | null;
}

export function fromProductionPhoto(row: {
  id?: string;
  storage_path: string;
  caption?: string | null;
  sort_order: number;
  rotation_deg?: number | null;
}): SurprisePhoto {
  return {
    id: row.id,
    storagePath: row.storage_path,
    caption: row.caption ?? "",
    position: row.sort_order,
    rotationDeg: row.rotation_deg ?? null,
  };
}

export function toProductionPhoto(p: SurprisePhoto): {
  storage_path: string;
  caption: string;
  sort_order: number;
  rotation_deg: number | null;
} {
  return {
    storage_path: p.storagePath,
    caption: p.caption ?? "",
    sort_order: p.position,
    rotation_deg: p.rotationDeg ?? null,
  };
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export interface HandoffProfile {
  id: string;
  name: string;
  email: string;
  /** The handoff models two tiers; production carries three. */
  tier: "free" | "unlimited";
  onboarded: boolean;
}

export function fromProductionProfile(row: {
  id: string;
  full_name?: string | null;
  email?: string | null;
  subscription_tier?: string | null;
  welcomed_at?: string | null;
}): HandoffProfile {
  return {
    id: row.id,
    name: row.full_name ?? "",
    email: row.email ?? "",
    // production: free | plus | unlimited. The handoff's B6 plan card shows two.
    // Anything that is not free buys the same mobile capabilities today.
    tier: (row.subscription_tier ?? "free") === "free" ? "free" : "unlimited",
    onboarded: !!row.welcomed_at,
  };
}
