import { describe, it, expect } from "vitest";
import { styleToMode } from "./designer-art-render";

describe("styleToMode", () => {
  it("classic → editorial", () => expect(styleToMode("classic")).toBe("editorial"));
  it("minimal → quiet", () => expect(styleToMode("minimal")).toBe("quiet"));
  it("bold → modern", () => expect(styleToMode("bold")).toBe("modern"));
});
