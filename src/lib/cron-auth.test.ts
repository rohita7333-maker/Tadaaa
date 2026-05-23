import { describe, it, expect } from "vitest";
import { safeBearerCheck } from "./cron-auth";

describe("safeBearerCheck", () => {
  it("returns false for null header", () => {
    expect(safeBearerCheck(null, "mysecret")).toBe(false);
  });

  it("returns false for empty string header", () => {
    expect(safeBearerCheck("", "mysecret")).toBe(false);
  });

  it("returns true for exact match", () => {
    expect(safeBearerCheck("Bearer mysecret", "mysecret")).toBe(true);
  });

  it("returns false when token is a prefix of the correct value", () => {
    expect(safeBearerCheck("Bearer mysecre", "mysecret")).toBe(false);
  });

  it("returns false when token has extra characters appended", () => {
    expect(safeBearerCheck("Bearer mysecret-extra", "mysecret")).toBe(false);
  });

  it("returns false when header lacks Bearer prefix", () => {
    expect(safeBearerCheck("mysecret", "mysecret")).toBe(false);
  });

  it("returns false when header is just 'Bearer '", () => {
    expect(safeBearerCheck("Bearer ", "mysecret")).toBe(false);
  });

  it("returns false for case-different secret", () => {
    expect(safeBearerCheck("Bearer MySecret", "mysecret")).toBe(false);
  });
});
