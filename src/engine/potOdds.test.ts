import { describe, expect, it } from "vitest";
import { requiredEquity, shouldCall } from "./potOdds";

describe("shouldCall", () => {
  it("returns true when win probability meets required equity", () => {
    expect(shouldCall({ pot: 120, call: 30, winProbability: 0.2 })).toBe(true);
    expect(shouldCall({ pot: 120, call: 30, winProbability: 0.19 })).toBe(false);
  });
});

describe("requiredEquity", () => {
  it("rejects non-positive pot and call", () => {
    expect(() => requiredEquity(0, 30)).toThrow("Pot must be positive");
    expect(() => requiredEquity(120, 0)).toThrow("Call must be positive");
  });
});
