import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: () => [] })),
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual };
});

const mockStorageBucket = {
  list: vi.fn(),
  remove: vi.fn(),
};

const mockServiceFrom = vi.fn();
const mockAdminStorage = { from: vi.fn(() => mockStorageBucket) };

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: async () => ({ from: mockServiceFrom }),
  createAdminClient: () => ({ storage: mockAdminStorage }),
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

function makeRequest(auth?: string) {
  const headers: Record<string, string> = {};
  if (auth) headers["authorization"] = auth;
  return new NextRequest("http://localhost/api/cron/sweep-orphans", { headers });
}

describe("GET /api/cron/sweep-orphans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
    mockAdminStorage.from.mockReturnValue(mockStorageBucket);
    mockStorageBucket.list.mockResolvedValue({ data: [], error: null });
    mockStorageBucket.remove.mockResolvedValue({ error: null });
    // Default: no orphan invites
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  it("returns 401 when Authorization header missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when Bearer token is wrong", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("returns 500 when CRON_SECRET not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
  });

  it("returns 200 with deletedFiles and deletedInvites counts", async () => {
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("deletedFiles");
    expect(body).toHaveProperty("deletedInvites");
  });

  it("deletes pending files older than 30 min", async () => {
    const thirtyOneMinAgo = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Top-level list: two user folders
    mockStorageBucket.list
      .mockResolvedValueOnce({
        data: [
          { name: "user-old", id: null, updated_at: thirtyOneMinAgo, created_at: thirtyOneMinAgo, metadata: null },
          { name: "user-fresh", id: null, updated_at: fiveMinAgo, created_at: fiveMinAgo, metadata: null },
        ],
        error: null,
      })
      // user-old subfolder: one invite
      .mockResolvedValueOnce({
        data: [{ name: "invite-1", id: null, updated_at: thirtyOneMinAgo, created_at: thirtyOneMinAgo, metadata: null }],
        error: null,
      })
      // user-old/invite-1 files
      .mockResolvedValueOnce({
        data: [
          { name: "0.jpg", id: "file-1", updated_at: thirtyOneMinAgo, created_at: thirtyOneMinAgo, metadata: { size: 100 } },
        ],
        error: null,
      })
      // user-fresh subfolder: one invite
      .mockResolvedValueOnce({
        data: [{ name: "invite-2", id: null, updated_at: fiveMinAgo, created_at: fiveMinAgo, metadata: null }],
        error: null,
      })
      // user-fresh/invite-2 files
      .mockResolvedValueOnce({
        data: [
          { name: "0.jpg", id: "file-2", updated_at: fiveMinAgo, created_at: fiveMinAgo, metadata: { size: 100 } },
        ],
        error: null,
      });

    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deletedFiles).toBe(1);

    // Must have called remove with the old file path only
    expect(mockStorageBucket.remove).toHaveBeenCalledWith(["pending/user-old/invite-1/0.jpg"]);
  });

  it("deletes orphan invite rows (no photos) older than 30 min", async () => {
    const orphanInvites = [
      { id: "orphan-1", creator_id: "user-old" },
    ];

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "invites") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: orphanInvites, error: null }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ lt: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }) }),
        }),
        delete: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ error: null }) }),
      };
    });

    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deletedInvites).toBe(1);
  });
});
