/**
 * Frame B5 — per-surprise analytics.
 *
 * Everything here is pure. Colour is NOT: this module returns semantic tone
 * keys ("peak"/"ink"/"coral") and `app/analytics/[id].tsx` maps them onto
 * tokens, the same split every other `lib/` module keeps.
 *
 * ── What the frame asks for and what the database can actually answer ──────
 *
 * The frame's second stat tile is "Avg time" and its third panel is
 * "Where from", a country breakdown. Neither has a column behind it, and
 * neither can be derived: no session duration is recorded anywhere, and
 * `invite_views` stores `user_agent` but no IP, region or country. Web's own
 * analytics page reached the same wall and renders neither panel
 * (`surprise-invite/src/lib/analytics-data.ts`, header comment).
 *
 * So, disclosed rather than invented:
 *   - "Avg time"   -> "This week", the sum of the 7-day series directly below
 *                     it. Real, sourced, and it explains the chart.
 *   - "Where from" -> "What they opened it on", bucketed from the real
 *                     `user_agent` column. Same row layout, true numbers.
 *
 * The funnel is three rows, not the frame's four. "Scrolled" and "Saw photos"
 * need per-scene events (the handoff's `reveal_events` table) that do not
 * exist on this project. The three that DO exist use web's own labels so the
 * same number is never called two different things across platforms.
 */

/** Days in the trend chart. Matches the frame's 7-bar panel and the RPC. */
export const ANALYTICS_DAY_WINDOW = 7;

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/* --------------------------------------------------------------- payload */

export interface AnalyticsDay {
  /** `YYYY-MM-DD` in the surprise's display timezone. Stable list key. */
  readonly day: string;
  readonly count: number;
}

export interface AnalyticsDevice {
  readonly label: string;
  readonly count: number;
}

export interface InviteAnalytics {
  /**
   * Whether the gated panels were served. Decided SERVER-side by
   * `get_invite_analytics` — a free-tier caller never receives `days` or
   * `devices`, so the blur is a presentation of an absence, not a cover over
   * data the client already holds.
   */
  readonly full: boolean;
  readonly timezone: string;
  /**
   * `invites.view_count` — the same counter B1, B2 and web's dashboard show.
   * The headline number and the funnel denominator both use it, so one
   * surprise never carries two different "views" across two screens.
   */
  readonly views: number;
  /**
   * Rows in `invite_views`. Only this table carries a timestamp, so the chart
   * and `weekViews` come from it — and it can LAG `views`, because every
   * surprise opened from the phone before `log_invite_open` existed bumped the
   * counter without writing a row. The screen says so when they disagree
   * rather than quietly presenting a chart that does not add up.
   */
  readonly loggedViews: number;
  readonly weekViews: number;
  readonly rsvps: number;
  readonly answers: number;
  readonly reactions: number;
  readonly days: readonly AnalyticsDay[];
  readonly devices: readonly AnalyticsDevice[];
}

export type AnalyticsResult =
  | { readonly ok: true; readonly data: InviteAnalytics }
  | { readonly ok: false; readonly error: "forbidden" | "unavailable" };

/* --------------------------------------------------------------- helpers */

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/** `Math.round`, clamped to 0-100. Divide-by-zero is guarded at each site. */
function percentOf(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / whole) * 100)));
}

/**
 * Weekday initial for a `YYYY-MM-DD` key.
 *
 * Parsed through `Date.UTC` rather than `new Date(key)`: the string form is
 * spec'd as UTC midnight, so in any zone behind UTC a plain `new Date` lands
 * on the previous evening and every bar is labelled one day early.
 */
export function weekdayInitial(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
  return WEEKDAY_INITIALS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/* ------------------------------------------------------------ bar chart */

export type BarTone = "peak" | "second" | "base";

export interface AnalyticsBar {
  readonly day: string;
  readonly label: string;
  readonly count: number;
  /** 0-100 of the panel's 110px track. */
  readonly heightPct: number;
  readonly tone: BarTone;
}

/**
 * Frame B5: "Bars are pebble; the two highest are sand and coral."
 *
 * Ranked by DISTINCT value, so three days tied at the top are all peak rather
 * than one of them winning on array order. A week with no views is seven flat
 * base bars — the panel still draws its axis instead of collapsing.
 */
export function buildBars(days: readonly AnalyticsDay[]): AnalyticsBar[] {
  const counts = days.map((d) => toCount(d.count));
  const ranked = [...new Set(counts.filter((c) => c > 0))].sort((a, b) => b - a);
  const max = ranked[0] ?? 0;

  return days.map((d, i) => {
    const count = counts[i];
    const tone: BarTone =
      count === 0 ? "base" : count === ranked[0] ? "peak" : count === ranked[1] ? "second" : "base";
    return {
      day: d.day,
      label: weekdayInitial(d.day),
      count,
      heightPct: max > 0 ? Math.round((count / max) * 100) : 0,
      tone,
    };
  });
}

/* --------------------------------------------------------------- funnel */

export type FunnelTone = "ink" | "sand" | "coral";

export interface FunnelRow {
  readonly key: "opened" | "rsvped" | "answered";
  readonly label: string;
  readonly count: number;
  readonly percent: number;
  readonly tone: FunnelTone;
  /**
   * Whether the percentage fits inside the bar. The frame always draws it
   * inside, which is right at 46% and wrong at 3%: seen rendered, a 0% bar
   * wrapped its label to "0 / %" and spilled over the edge. Below the
   * threshold the screen puts the number beside the bar instead.
   */
  readonly labelInside: boolean;
}

/**
 * Narrowest bar that can hold "100%" at 11px/600 with the frame's 8px inset.
 * The funnel column is roughly 250pt wide on a 390pt screen, so 22% is ~55pt
 * against a ~40pt label — the first width with real margin.
 */
const FUNNEL_LABEL_MIN_PERCENT = 22;

export interface FunnelInput {
  readonly views: number;
  readonly rsvps: number;
  readonly answers: number;
}

/**
 * Opened -> Said yes -> Answered, each measured against opens.
 *
 * Labels are web's `buildFunnel` verbatim (`surprise-invite/src/lib/
 * analytics-data.ts`). Percentages are clamped: `record_rsvp` is callable
 * without ever loading the reveal page that logs a view, so a step CAN exceed
 * 100% and must not draw outside its track.
 */
export function buildFunnel({ views, rsvps, answers }: FunnelInput): FunnelRow[] {
  const opened = toCount(views);
  const steps = [
    { key: "opened" as const, label: "Opened", count: opened, tone: "ink" as const },
    { key: "rsvped" as const, label: "Said yes", count: toCount(rsvps), tone: "sand" as const },
    { key: "answered" as const, label: "Answered", count: toCount(answers), tone: "coral" as const },
  ];

  return steps.map((step) => {
    const percent =
      step.key === "opened" ? (opened > 0 ? 100 : 0) : percentOf(step.count, opened);
    return { ...step, percent, labelInside: percent >= FUNNEL_LABEL_MIN_PERCENT };
  });
}

/* ---------------------------------------------------------------- parse */

function parseDays(raw: unknown): AnalyticsDay[] {
  if (!Array.isArray(raw)) return [];
  const out: AnalyticsDay[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const day = (row as { day?: unknown }).day;
    const count = (row as { count?: unknown }).count;
    if (typeof day !== "string" || day === "") continue;
    if (typeof count !== "number" || !Number.isFinite(count)) continue;
    out.push({ day, count: Math.max(0, Math.floor(count)) });
  }
  return out;
}

function parseDevices(raw: unknown): AnalyticsDevice[] {
  if (!Array.isArray(raw)) return [];
  const out: AnalyticsDevice[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const label = (row as { label?: unknown }).label;
    const count = (row as { count?: unknown }).count;
    if (typeof label !== "string" || label.trim() === "") continue;
    if (typeof count !== "number" || !Number.isFinite(count)) continue;
    out.push({ label, count: Math.max(0, Math.floor(count)) });
  }
  return out;
}

/**
 * `get_invite_analytics` returns jsonb, which arrives as `unknown`. Anything
 * that is not a recognisable success envelope becomes "unavailable" — a
 * malformed payload must reach the error state, not render as a surprise with
 * no activity, which is a very different and very discouraging message.
 */
export function parseAnalytics(raw: unknown): AnalyticsResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "unavailable" };
  const envelope = raw as Record<string, unknown>;
  if (envelope.ok === false) return { ok: false, error: "forbidden" };
  if (envelope.ok !== true) return { ok: false, error: "unavailable" };

  return {
    ok: true,
    data: {
      full: envelope.full === true,
      timezone: typeof envelope.timezone === "string" ? envelope.timezone : "UTC",
      views: toCount(envelope.views),
      loggedViews: toCount(envelope.loggedViews),
      weekViews: toCount(envelope.weekViews),
      rsvps: toCount(envelope.rsvps),
      answers: toCount(envelope.answers),
      reactions: toCount(envelope.reactions),
      days: parseDays(envelope.days),
      devices: parseDevices(envelope.devices),
    },
  };
}

/* --------------------------------------------------------------- export */

/** The report is rendered by a real HTML engine, so titles must be escaped. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface AnalyticsReportInput {
  readonly title: string;
  readonly url: string;
  readonly generatedAt: Date;
  readonly data: InviteAnalytics;
}

/**
 * Frame B5's header arrow: "exports a PDF report through the native share
 * sheet". `expo-print` turns this document into the PDF; nothing else on the
 * device can, so this is the whole of the report.
 *
 * Styling is inline and deliberately plain — a print stylesheet is not the
 * app's identity, and a PDF that tries to be one prints badly.
 */
export function analyticsReportHtml({
  title,
  url,
  generatedAt,
  data,
}: AnalyticsReportInput): string {
  const rows = (pairs: readonly (readonly [string, string])[]) =>
    pairs
      .map(
        ([k, v]) =>
          `<tr><td>${escapeHtml(k)}</td><td style="text-align:right;font-weight:600">${escapeHtml(v)}</td></tr>`
      )
      .join("");

  const funnel = buildFunnel(data);

  const lag =
    data.loggedViews < data.views
      ? `<p class="note">${data.views - data.loggedViews} of these opens predate per-open logging, so the daily chart below counts ${data.loggedViews}.</p>`
      : "";

  const gated = data.full
    ? `${lag}
    <h2>Views, last 7 days</h2>
    <table>${rows(data.days.map((d) => [d.day, String(d.count)] as const))}</table>
    <h2>What they opened it on</h2>
    <table>${rows(data.devices.map((d) => [d.label, String(d.count)] as const))}</table>`
    : `<p class="note">Full analytics are part of Premium. This report carries the totals only.</p>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)} — analytics</title>
<style>
  body{font:14px -apple-system,system-ui,sans-serif;color:#1A1A1A;padding:32px}
  h1{font:400 26px Georgia,serif;margin:0 0 4px}
  h2{font:400 18px Georgia,serif;margin:26px 0 8px}
  .sub{color:#484848;margin:0 0 20px}
  .note{color:#484848;border:1px solid #E8E4E0;border-radius:12px;padding:14px}
  table{width:100%;border-collapse:collapse}
  td{padding:7px 0;border-bottom:1px solid #F5F0ED}
</style></head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${escapeHtml(url)}<br>Report generated ${escapeHtml(generatedAt.toISOString())} · times in ${escapeHtml(data.timezone)}</p>
  <h2>Totals</h2>
  <table>${rows([
    ["Views", String(data.views)],
    ["This week", String(data.weekViews)],
    ["Said yes", String(data.rsvps)],
    ["Answered", String(data.answers)],
    ["Reactions", String(data.reactions)],
  ])}</table>
  <h2>How far they got</h2>
  <table>${rows(funnel.map((r) => [r.label, `${r.count} · ${r.percent}%`] as const))}</table>
  ${gated}
</body></html>`;
}
