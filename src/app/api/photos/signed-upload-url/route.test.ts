import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: () => [] })),
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual };
});

const mockStorageFrom = vi.fn();
const mockAuthGetUser = vi.fn();
const mockFromTable = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockAuthGetUser },
    from: mockFromTable,
  }),
  createAdminClient: () => ({
    storage: { from: mockStorageFrom },
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => true),
}));

import { POST } from "./route";
import { NextRequest } from "next/server";

function makeRequest(body: object, auth = true) {
  const req = new NextRequest("http://localhost/api/photos/signed-upload-url", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
  return req;
}

describe("POST /api/photos/signed-upload-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    mockFromTable.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "invite-abc" }, error: null }),
          }),
        }),
      }),
    });

    mockStorageFrom.mockReturnValue({
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://storage.example.com/signed", token: "tok" },
        error: null,
      }),
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ inviteId: "invite-abc", index: 0, ext: "jpg" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when invite not owned by user", async () => {
    mockFromTable.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });
    const res = await POST(makeRequest({ inviteId: "invite-abc", index: 0, ext: "jpg" }));
    expect(res.status).toBe(404);
  });

  // BLOCKER #1: path must start with pending/
  it("returns path starting with pending/ prefix", async () => {
    const res = await POST(makeRequest({ inviteId: "invite-abc", index: 0, ext: "jpg" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.path).toMatch(/^pending\//);
    expect(body.path).toBe("pending/user-123/invite-abc/0.jpg");
  });

  // BLOCKER #3: ext must be hardcoded literal, never user-controlled string
  it("normalizes uppercase ext to lowercase literal", async () => {
    const res = await POST(makeRequest({ inviteId: "invite-abc", index: 0, ext: "PNG" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.path).toBe("pending/user-123/invite-abc/0.png");
  });

  it("defaults to jpg for unknown ext", async () => {
    const res = await POST(makeRequest({ inviteId: "invite-abc", index: 0, ext: "tiff" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.path).toMatch(/\.jpg$/);
  });

  it("rejects path traversal attempt in ext", async () => {
    const res = await POST(makeRequest({ inviteId: "invite-abc", index: 0, ext: "../etc/passwd" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Must be hardcoded literal, not user-supplied string
    expect(body.path).toMatch(/\.jpg$/);
    expect(body.path).not.toContain("..");
  });
});
