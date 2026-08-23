import { planCard } from "../plan-card";

describe("planCard", () => {
  it("names the free plan and its three limits, per frame B6", () => {
    const card = planCard("free");
    expect(card.tierName).toBe("Free");
    expect(card.summary).toBe(
      "2 surprises a month · 8 photos · 7-day links. Unlimited is $1.99/mo."
    );
  });

  it("offers the upgrade only while there is something to upgrade to", () => {
    expect(planCard("free").ctaLabel).toBe("Go Unlimited");
    expect(planCard("plus").ctaLabel).toBe("Go Unlimited");
    expect(planCard("unlimited").ctaLabel).toBeNull();
  });

  it("names the paid tiers the way the pricing page does", () => {
    expect(planCard("plus").tierName).toBe("Premium Surprise");
    expect(planCard("unlimited").tierName).toBe("Unlimited");
  });

  it("drops the upsell sentence once the user is already unlimited", () => {
    expect(planCard("unlimited").summary).not.toContain("$1.99");
    expect(planCard("unlimited").summary).toContain("Unlimited surprises");
  });

  it("describes what Premium Surprise actually bought — not the free limits", () => {
    const card = planCard("plus");
    expect(card.summary).toContain("20 photos");
    expect(card.summary).not.toContain("2 surprises a month");
  });
});
