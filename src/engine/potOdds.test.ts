import { describe, expect, it } from "vitest";
import {
  callExpectedValue,
  chaseOutBet,
  maxCorrectCall,
  requiredEquity,
  shouldCall,
} from "./potOdds";

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

describe("callExpectedValue", () => {
  it("returns positive money for profitable calls and negative money for bad calls", () => {
    expect(callExpectedValue({ pot: 120, call: 30, winProbability: 0.25 })).toBe(7.5);
    expect(callExpectedValue({ pot: 120, call: 30, winProbability: 0.1 })).toBe(-15);
  });

  it("is break-even at the required equity threshold", () => {
    expect(callExpectedValue({ pot: 120, call: 30, winProbability: 0.2 })).toBe(0);
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

describe("chaseOutBet", () => {
  it("returns the smallest whole-dollar bet that makes the call mathematically wrong", () => {
    expect(chaseOutBet({ pot: 100, winProbability: 0.2 })).toBe(26);
    expect(shouldCall({ pot: 100, call: 25, winProbability: 0.2 })).toBe(true);
    expect(shouldCall({ pot: 100, call: 26, winProbability: 0.2 })).toBe(false);
  });

  it("uses the next dollar after an exact break-even call", () => {
    expect(chaseOutBet({ pot: 120, winProbability: 0.2 })).toBe(31);
  });

  it("returns null when no finite bet can chase out a guaranteed winner", () => {
    expect(chaseOutBet({ pot: 120, winProbability: 1 })).toBeNull();
  });
});
