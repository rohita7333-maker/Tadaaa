import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * RPC RECEIVER GATE.
 *
 * `SupabaseClient.rpc` is a prototype METHOD whose body is
 * `return this.rest.rpc(...)`. Detaching it —
 *
 *     const call = supabase.rpc as unknown as (fn, params) => …;
 *     await call("get_reaction_counts", { p_slug: slug });
 *
 * — loses the receiver, so `this` is undefined and every call throws
 * `TypeError: Cannot read properties of undefined (reading 'rest')`.
 *
 * ELEVEN call sites shipped in exactly that state. Between them they carried
 * the entire reveal (`get_invite_by_slug`, `get_invite_reveal`), the PIN gate
 * (`get_invite_pin_meta`, `verify_invite_pin`), the open-when letters, the
 * reaction bar, the moderation queue and the contributor form. Every one of
 * them was dead on both platforms.
 *
 * Nothing else could have caught it:
 *   - `tsc` cannot: the detachment hides behind `as unknown as`.
 *   - jest cannot: every suite in this repo is a pure-logic suite.
 *   - the live PostgREST probes could not: curl never goes through the client.
 * It was found by loading a screen in a browser and reading the unhandled
 * rejection. This gate is what makes it stay found.
 */

const SRC = resolve(__dirname, "../..");

function sourceFiles(dir: string = SRC): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      out.push(...sourceFiles(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("supabase.rpc keeps its receiver", () => {
  it("is only ever called directly or bound — never assigned bare", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/supabase\.rpc(?!\s*\()/g)) {
        const after = source.slice(match.index ?? 0, (match.index ?? 0) + 40);
        // The two safe forms: a direct call (excluded by the lookahead above)
        // and an explicit bind that carries the client with it.
        if (/^supabase\.rpc\.bind\(\s*supabase\s*\)/.test(after)) continue;
        const line = source.slice(0, match.index).split("\n").length;
        offenders.push(`${file.slice(SRC.length + 1)}:${line}`);
      }
    }

    expect({ detachedRpcReferences: offenders }).toEqual({ detachedRpcReferences: [] });
  });

  it("proves the guard can fail — the exact pattern that shipped is rejected", () => {
    // Negative control. Without this, a regex that matches nothing reads as a
    // passing gate forever.
    const shipped = 'const call = supabase.rpc as unknown as (\n  fn: string,\n)';
    const bound = "const call = supabase.rpc.bind(supabase) as unknown as (";
    const flag = (s: string) =>
      [...s.matchAll(/supabase\.rpc(?!\s*\()/g)].filter(
        (m) => !/^supabase\.rpc\.bind\(\s*supabase\s*\)/.test(s.slice(m.index ?? 0, (m.index ?? 0) + 40))
      ).length;

    expect(flag(shipped)).toBe(1);
    expect(flag(bound)).toBe(0);
    expect(flag('await supabase.rpc("get_invite_analytics", { p_invite_id: id })')).toBe(0);
  });
});
