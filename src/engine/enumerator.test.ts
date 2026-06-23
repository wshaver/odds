import { describe, expect, it } from "vitest";
import { parseCardList } from "./cards";
import { enumerateNextCardOutcomes } from "./enumerator";
import { buildDeck, removeKnownCards } from "./cards";

describe("enumerateNextCardOutcomes", () => {
  it("removes opponent cards from possible next cards", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("6s7s"),
      opponent: parseCardList("TdTc"),
      board: parseCardList("8s9dKh2s"),
    });

    expect(result.remaining).toBe(44);
  });

  it("counts only cards that beat the opponent's exact pair rank", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("Js8d"),
      opponent: parseCardList("TdTc"),
      board: parseCardList("2s3d4h9c"),
    });

    expect(result.winningCards).toEqual(parseCardList("JcJdJh"));
    expect(result.win).toBe(3);
    expect(result.push).toBe(0);
    expect(result.miss).toBe(41);
    expect(result.winProbability).toBe(3 / 44);
  });

  it("does not count weaker pairs as wins against the opponent", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("8s7d"),
      opponent: parseCardList("TdTc"),
      board: parseCardList("2s3d4h9c"),
    });

    expect(result.winningCards).not.toContainEqual(parseCardList("8c")[0]);
    expect(result.winningCards).not.toContainEqual(parseCardList("7c")[0]);
  });

  it("classifies shared-board made hands as pushes", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("AsKd"),
      opponent: parseCardList("AcKc"),
      board: parseCardList("2c2h3s2s"),
    });

    expect(result.remaining).toBe(44);
    expect(result.win).toBe(0);
    expect(result.push).toBe(44);
    expect(result.miss).toBe(0);
    expect(result.winningCards).toEqual([]);
    expect(result.winningCards).not.toContainEqual(parseCardList("2d")[0]);
  });

  it("classifies a shared-board full-house counter improvement as a hero win", () => {
    const result = enumerateNextCardOutcomes({
      hero: parseCardList("AsAd"),
      opponent: parseCardList("QsQd"),
      board: parseCardList("2c2h2sKc"),
    });

    expect(result.winningCards).toContainEqual(parseCardList("Kd")[0]);
  });

  it("classifies a 3-card flop correctly with exact counts and outs", () => {
    const hero = parseCardList("AsAd");
    const opponent = parseCardList("QhQd");
    const board = parseCardList("2c3d4h");
    const remainingCards = removeKnownCards(buildDeck(), [...hero, ...opponent, ...board]);
    const result = enumerateNextCardOutcomes({
      hero,
      opponent,
      board,
    });

    expect(result).toEqual({
      remaining: 45,
      win: 43,
      push: 0,
      miss: 2,
      winProbability: 43 / 45,
      winningCards: remainingCards.filter((card) => card.rank !== "Q"),
    });
  });

  it("requires exactly two hero cards", () => {
    expect(() =>
      enumerateNextCardOutcomes({
        hero: parseCardList("As"),
        opponent: parseCardList("TdTc"),
        board: parseCardList("2s7s9d"),
      }),
    ).toThrow("Hero must have exactly 2 cards");
  });

  it("requires exactly two opponent cards", () => {
    expect(() =>
      enumerateNextCardOutcomes({
        hero: parseCardList("AsKs"),
        opponent: parseCardList("Td"),
        board: parseCardList("2s7s9d"),
      }),
    ).toThrow("Opponent must have exactly 2 cards");
  });

  it("requires flop or turn board size", () => {
    expect(() =>
      enumerateNextCardOutcomes({
        hero: parseCardList("AsKs"),
        opponent: parseCardList("TdTc"),
        board: parseCardList("2s7s"),
      }),
    ).toThrow("Board must have 3 or 4 cards");
  });
});
