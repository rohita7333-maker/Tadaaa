import { describe, it, expect, vi } from "vitest";

// Mock next/headers so getRequestMeta is safe to import alongside logAudit
// even though this test only exercises logAudit.
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

const insertOk = vi.fn().mockResolvedValue({ error: null });
const insertReject = vi.fn().mockRejectedValue(new Error("boom"));
const adminInsertOk = vi.fn().mockResolvedValue({ error: null });

// User-context client (cookie-bound). Used when userId is set.
// Admin client (service role). Used when userId is null (pre-auth events).
// Vitest re-imports inside describes are awkward — flip behavior via a
// module-level switch instead.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      insert: (...args: unknown[]) =>
        (globalThis as { __auditInsertMode?: "ok" | "throw" }).__auditInsertMode === "throw"
          ? insertReject(...args)
          : insertOk(...args),
    })),
  })),
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: (...args: unknown[]) => adminInsertOk(...args),
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
      logAudit({ userId: "u1", action: "signin.password" }),
    ).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
    (globalThis as { __auditInsertMode?: "ok" | "throw" }).__auditInsertMode = "ok";
  });

  it("routes null-userId (pre-auth) events through the admin client", async () => {
    insertOk.mockClear();
    adminInsertOk.mockClear();
    await expect(
      logAudit({ userId: null, action: "magic_link.request" }),
    ).resolves.toBeUndefined();
    // user-context client must NOT be used for pre-auth events
    expect(insertOk).not.toHaveBeenCalled();
    // admin client must receive the insert
    expect(adminInsertOk).toHaveBeenCalledTimes(1);
    const arg = adminInsertOk.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.user_id).toBeNull();
    expect(arg.action).toBe("magic_link.request");
  });
});
