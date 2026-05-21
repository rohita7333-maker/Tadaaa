import { describe, it, expect, vi } from "vitest";

// Mock next/headers so getRequestMeta is safe to import alongside logAudit
// even though this test only exercises logAudit.
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

const insertOk = vi.fn().mockResolvedValue({ error: null });
const insertReject = vi.fn().mockRejectedValue(new Error("boom"));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      // Vitest re-imports inside describes are awkward — flip behavior via a
      // module-level switch instead.
      insert: (...args: unknown[]) =>
        (globalThis as { __auditInsertMode?: "ok" | "throw" }).__auditInsertMode === "throw"
          ? insertReject(...args)
          : insertOk(...args),
    })),
  })),
}));

import { logAudit } from "./audit";

describe("logAudit", () => {
  it("inserts row with action + meta and resolves", async () => {
    (globalThis as { __auditInsertMode?: "ok" | "throw" }).__auditInsertMode = "ok";
    insertOk.mockClear();
    await expect(
      logAudit({ userId: "u1", action: "signin.password", ip: "1.1.1.1" }),
    ).resolves.toBeUndefined();
    expect(insertOk).toHaveBeenCalledTimes(1);
    const arg = insertOk.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.user_id).toBe("u1");
    expect(arg.action).toBe("signin.password");
    expect(arg.ip).toBe("1.1.1.1");
  });

  it("swallows errors so it never breaks the user flow", async () => {
    (globalThis as { __auditInsertMode?: "ok" | "throw" }).__auditInsertMode = "throw";
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      logAudit({ userId: null, action: "signin.password" }),
    ).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
    (globalThis as { __auditInsertMode?: "ok" | "throw" }).__auditInsertMode = "ok";
  });
});
