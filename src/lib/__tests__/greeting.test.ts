import { greeting, timeOfDay } from "../greeting";

/** Thresholds are web's, verbatim: <12 morning, <18 afternoon, else evening. */
describe("timeOfDay", () => {
  it("uses web's boundaries", () => {
    expect(timeOfDay(0)).toBe("morning");
    expect(timeOfDay(11)).toBe("morning");
    expect(timeOfDay(12)).toBe("afternoon");
    expect(timeOfDay(17)).toBe("afternoon");
    expect(timeOfDay(18)).toBe("evening");
    expect(timeOfDay(23)).toBe("evening");
  });
});

describe("greeting", () => {
  it("matches web's rendered string", () => {
    expect(greeting("Rohit", 9)).toBe("Good morning, Rohit");
    expect(greeting("Rohit", 14)).toBe("Good afternoon, Rohit");
    expect(greeting("Rohit", 20)).toBe("Good evening, Rohit");
  });

  it("omits the comma when there is no name, like web", () => {
    expect(greeting(undefined, 20)).toBe("Good evening");
    expect(greeting("", 9)).toBe("Good morning");
  });

  it("never falls back to the retired mobile-only greeting", () => {
    expect(greeting("Rohit", 9)).not.toContain("Hello");
  });
});
