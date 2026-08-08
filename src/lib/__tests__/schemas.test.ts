/// <reference types="jest" />
import { signUpSchema } from "../schemas";

describe("signUpSchema", () => {
  it("accepts a valid signup", () => {
    expect(
      signUpSchema.safeParse({
        fullName: "Alice",
        email: "a@b.co",
        password: "longenoughpw",
      }).success
    ).toBe(true);
  });

  it("rejects disposable email domains", () => {
    expect(
      signUpSchema.safeParse({
        fullName: "Alice",
        email: "alice@mailinator.com",
        password: "longenoughpw",
      }).success
    ).toBe(false);
  });

  it("rejects disposable email domains case-insensitively", () => {
    expect(
      signUpSchema.safeParse({
        fullName: "Alice",
        email: "alice@MAILINATOR.COM",
        password: "longenoughpw",
      }).success
    ).toBe(false);
  });

  it("accepts a non-disposable domain that merely contains a disposable substring", () => {
    expect(
      signUpSchema.safeParse({
        fullName: "Alice",
        email: "alice@notmailinator.com",
        password: "longenoughpw",
      }).success
    ).toBe(true);
  });
});
