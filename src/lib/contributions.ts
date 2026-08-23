/**
 * Contributions — the owner's moderation queue (B2 / B4 / C3) and the
 * contributor's submit path (E1).
 *
 * SECURITY BOUNDARY, verified live 2026-08-17 before any of this was written:
 *
 *   anon  SELECT invite_contributions            -> []
 *   anon  INSERT invite_contributions            -> 42501 (no policy exists)
 *   owner SELECT a pending row via the table     -> []   ← the queue was dead
 *   owner UPDATE a pending row via the table     -> []   ← approve was dead
 *
 * The permissive SELECT policy is `approved = true`, so a creator could not see
 * the very rows moderation exists for, and there is no UPDATE or INSERT policy
 * at all. Three SECURITY DEFINER functions close that without widening the
 * table: `get_owner_contributions`, `moderate_contribution`,
 * `submit_contribution`. Ownership and the `accept_contributions` gate are
 * checked server-side; the client cannot rewrite a contributor's words, only
 * their status.
 */
import { supabase } from "./supabase";
import { toModerationStatus, type ModerationStatus } from "./surprise-detail";

export const CONTRIBUTION_MAX = 300;

export interface OwnerContribution {
  id: string;
  name: string;
  message: string;
  photoUrl: string | null;
  status: ModerationStatus;
  createdAt: string | null;
}

// ---------------------------------------------------------------------------
// Validation (E1) — mirrors submit_contribution's server-side checks
// ---------------------------------------------------------------------------

export type ContributionValidation =
  | { ok: true }
  | { ok: false; field: "name" | "message"; message: string };

const NAME_REQUIRED = "Add your name first";
const TOO_LONG = `Keep it to ${CONTRIBUTION_MAX} characters`;

/**
 * Client-side mirror of the RPC's rules. Duplicated deliberately: the server
 * check is the one that counts, this one is so the field can shake before a
 * round trip (frame E1: "Empty name → coral border, shake, toast").
 */
export function validateContribution(input: {
  name: string;
  message: string;
}): ContributionValidation {
  if (input.name.trim() === "") {
    return { ok: false, field: "name", message: NAME_REQUIRED };
  }
  if (input.message.trim().length > CONTRIBUTION_MAX) {
    return { ok: false, field: "message", message: TOO_LONG };
  }
  return { ok: true };
}

const ERROR_MESSAGES: Record<string, string> = {
  name_required: NAME_REQUIRED,
  message_too_long: TOO_LONG,
  rate_limited: "That's a lot of messages — try again in a bit.",
  closed: "This surprise isn't taking messages any more.",
  already_submitted: "You've already added a message to this one.",
};

/**
 * `submit_contribution` returns a code, never prose. An unmapped code must fall
 * back rather than render raw — a contributor should never read
 * `already_submitted`, and definitely never a Postgres constraint name.
 */
export function contributionErrorMessage(code: string | null | undefined): string {
  return (code && ERROR_MESSAGES[code]) || "That didn't send. Try again.";
}

// ---------------------------------------------------------------------------
// Queue shaping
// ---------------------------------------------------------------------------

export interface ModerationBuckets {
  pending: OwnerContribution[];
  approved: OwnerContribution[];
  rejected: OwnerContribution[];
}

export function partitionByModeration(
  rows: readonly OwnerContribution[]
): ModerationBuckets {
  return {
    pending: rows.filter((r) => r.status === "pending"),
    approved: rows.filter((r) => r.status === "approved"),
    rejected: rows.filter((r) => r.status === "rejected"),
  };
}

/** Frame C3's counter line. */
export function pendingLine(pending: number, approved: number): string {
  if (pending === 0 && approved === 0) return "No messages yet";
  return `${pending} pending · ${approved} approved`;
}

// ---------------------------------------------------------------------------
// Server calls
// ---------------------------------------------------------------------------

interface RawOwnerContribution {
  id: string;
  contributor_name: string | null;
  message: string | null;
  photo_url: string | null;
  approved: boolean | null;
  moderation_status: string | null;
  created_at: string | null;
}

/** Untyped RPC bridge — `database.types.ts` predates these functions. */
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T | null> {
  const call = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{ data: T | null; error: unknown }>;
  const { data } = await call(name, args);
  return data ?? null;
}

/** Every contribution on an invite the caller owns — pending included. */
export async function getOwnerContributions(
  inviteId: string
): Promise<OwnerContribution[]> {
  const rows = await rpc<RawOwnerContribution[]>("get_owner_contributions", {
    p_invite_id: inviteId,
  });
  return (rows ?? []).map((r) => ({
    id: r.id,
    name: r.contributor_name ?? "",
    message: r.message ?? "",
    photoUrl: r.photo_url,
    status: toModerationStatus(r),
    createdAt: r.created_at,
  }));
}

export async function moderateContribution(
  id: string,
  status: ModerationStatus
): Promise<{ ok: boolean; code?: string }> {
  const res = await rpc<{ ok?: boolean; code?: string }>("moderate_contribution", {
    p_id: id,
    p_status: status,
  });
  return { ok: res?.ok === true, code: res?.code };
}

export async function submitContribution(input: {
  slug: string;
  name: string;
  message: string;
  photoUrl?: string | null;
  visitorHash: string;
}): Promise<{ ok: boolean; code?: string }> {
  const res = await rpc<{ ok?: boolean; code?: string }>("submit_contribution", {
    p_slug: input.slug,
    p_name: input.name,
    p_message: input.message,
    p_photo_url: input.photoUrl ?? null,
    p_visitor_hash: input.visitorHash,
  });
  return { ok: res?.ok === true, code: res?.code };
}
