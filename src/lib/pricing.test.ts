import { describe, it, expect } from "vitest";
import { pricingPlans } from "./pricing";

function plan(name: string) {
  const found = pricingPlans.find((p) => p.name === name);
  expect(found, `plan "${name}"`).toBeDefined();
  return found!;
}

describe("pricingPlans", () => {
  it("has exactly 4 plans", () => {
    expect(pricingPlans.map((p) => p.planKey)).toEqual([
      "free",
      "plus",
      "unlimited",
      "gift",
    ]);
  });

  it("Free is $0 forever", () => {
    const free = plan("Free");
    expect(free.monthlyPrice).toBe(0);
    expect(free.yearlyPrice).toBe(0);
    expect(free.periodOverride).toBe("forever");
  });

  it("Plus is $4.99 per surprise", () => {
    const plus = plan("Plus");
    expect(plus.monthlyPrice).toBe(4.99);
    expect(plus.yearlyPrice).toBe(4.99);
    expect(plus.periodOverride).toBe("per surprise");
  });

  it("Unlimited is $1.99/mo and $19.99/yr", () => {
    const unlimited = plan("Unlimited");
    expect(unlimited.monthlyPrice).toBe(1.99);
    expect(unlimited.yearlyPrice).toBe(19.99);
    expect(unlimited.periodOverride).toBeNull();
  });

  it("Gift is $5 for one invite", () => {
    const gift = plan("Gift");
    expect(gift.monthlyPrice).toBe(5);
    expect(gift.yearlyPrice).toBe(5);
    expect(gift.periodOverride).toBe("one invite");
  });
});
