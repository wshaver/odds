import { describe, expect, it } from "vitest";
import { parseCardList } from "./cards";
import {
  compareCategoryToTarget,
  compareBestHands,
  evaluateBestCategory,
  HAND_CATEGORIES,
} from "./handEvaluator";

describe("evaluateBestCategory", () => {
  it.each([
    ["AsKsQsJsTs9d2c", "straight-flush"],
    ["AsAdAhAcKs2d3c", "four-kind"],
    ["AsAdAhKsKd2d3c", "full-house"],
    ["AsJs8s4s2sKd3c", "flush"],
    ["9s8d7h6c5sKd2c", "straight"],
    ["As2d3h4c5sKdQc", "straight"],
    ["AsAdAhKsQd2d3c", "trips"],
    ["AsAdKhKcQd2d3c", "two-pair"],
    ["AsAdKhQc9d2d3c", "pair"],
    ["AsKdQh9c7d4d2c", "high-card"],
  ] as const)("recognizes %s as %s", (cards, category) => {
    expect(evaluateBestCategory(parseCardList(cards))).toBe(category);
  });

  it("exports hand categories from weakest to strongest", () => {
    expect(HAND_CATEGORIES).toEqual([
      "high-card",
      "pair",
      "two-pair",
      "trips",
      "straight",
      "flush",
      "full-house",
      "four-kind",
      "straight-flush",
    ]);
  });

  it("requires 5 to 7 cards", () => {
    expect(() => evaluateBestCategory(parseCardList("AsKdQh9c"))).toThrow(
      "Hand evaluation requires 5 to 7 cards",
    );
    expect(() => evaluateBestCategory(parseCardList("AsKdQh9c7d4d2c3s"))).toThrow(
      "Hand evaluation requires 5 to 7 cards",
    );
  });
});

describe("compareBestHands", () => {
  it("uses pair rank before kickers", () => {
    expect(
      compareBestHands(parseCardList("JsJdAh9c7s2d3c"), parseCardList("TsTdAh9c7s2d3c")),
    ).toBeGreaterThan(0);

    expect(
      compareBestHands(parseCardList("8s8dAh9c7s2d3c"), parseCardList("TsTdAh9c7s2d3c")),
    ).toBeLessThan(0);
  });

  it("uses kickers within the same category", () => {
    expect(
      compareBestHands(parseCardList("AsAdKh9c7s2d3c"), parseCardList("AsAdQh9c7s2d3c")),
    ).toBeGreaterThan(0);
  });

  it("returns zero for exact shared-board ties", () => {
    expect(
      compareBestHands(parseCardList("AsKdAhKhQhJhTh"), parseCardList("2c3dAhKhQhJhTh")),
    ).toBe(0);
  });
});

describe("compareCategoryToTarget", () => {
  it.each([
    ["full-house", "trips", "win"],
    ["trips", "trips", "push"],
    ["two-pair", "trips", "miss"],
  ] as const)("returns %s vs %s as %s", (category, target, outcome) => {
    expect(compareCategoryToTarget(category, target)).toBe(outcome);
  });
});
