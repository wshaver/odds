import { describe, expect, it } from "vitest";
import { parseCardList } from "./cards";
import { enumerateNextCardOutcomes } from "./enumerator";

describe("enumerateNextCardOutcomes", () => {
  it("counts flush outs as wins against trips from the turn", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("AsKs"),
      board: parseCardList("2s7s9dQc"),
      target: "trips",
    });

    expect(result).toEqual({
      remaining: 46,
      win: 9,
      push: 0,
      miss: 37,
      winProbability: 9 / 46,
      winningCards: parseCardList("3s4s5s6s8s9sTsJsQs"),
    });
  });

  it("counts matching target category as push, not win", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("AsKd"),
      board: parseCardList("Ah7c2d9s"),
      target: "trips",
    });

    expect(result.push).toBe(2);
    expect(result.win).toBe(0);
  });

  it("does not remove imagined opponent cards", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("6s7s"),
      board: parseCardList("8s9dKh2s"),
      target: "two-pair",
    });

    expect(result.remaining).toBe(46);
  });

  it("requires exactly two hero cards", () => {
    expect(() =>
      enumerateNextCardOutcomes({
        hero: parseCardList("As"),
        board: parseCardList("2s7s9d"),
        target: "trips",
      }),
    ).toThrow("Hero must have exactly 2 cards");
  });

  it("requires flop or turn board size", () => {
    expect(() =>
      enumerateNextCardOutcomes({
        hero: parseCardList("AsKs"),
        board: parseCardList("2s7s"),
        target: "trips",
      }),
    ).toThrow("Board must have 3 or 4 cards");
  });
});
