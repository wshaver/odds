import { describe, expect, it } from "vitest";
import { maxCorrectCall, requiredEquity, shouldCall } from "./potOdds";

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

describe("maxCorrectCall", () => {
  it("returns the largest break-even call amount for a pot and win probability", () => {
    expect(maxCorrectCall({ pot: 120, winProbability: 0.2 })).toBe(30);
    expect(maxCorrectCall({ pot: 100, winProbability: 0.5 })).toBe(100);
  });

  it("rounds down to a whole chip amount", () => {
    expect(maxCorrectCall({ pot: 100, winProbability: 0.33 })).toBe(49);
  });

  it("does not round exact integer call amounts down due to floating point drift", () => {
    expect(maxCorrectCall({ pot: 180, winProbability: 41 / 44 })).toBe(2460);
  });
});
