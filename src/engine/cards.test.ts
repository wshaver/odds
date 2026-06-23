import { describe, expect, test } from "vitest";

import {
  buildDeck,
  cardToString,
  parseCard,
  parseCardList,
  removeKnownCards,
} from "./cards";

describe("cards", () => {
  test("buildDeck returns 52 cards with 52 unique compact ids", () => {
    const deck = buildDeck();
    const compactIds = deck.map(cardToString);

    expect(deck).toHaveLength(52);
    expect(new Set(compactIds).size).toBe(52);
  });

  test('parseCard("Qs") equals queen of spades', () => {
    expect(parseCard("Qs")).toEqual({ rank: "Q", suit: "s" });
  });

  test('parseCardList("6s7sKh") returns 6s, 7s, Kh', () => {
    expect(parseCardList("6s7sKh")).toEqual([
      { rank: "6", suit: "s" },
      { rank: "7", suit: "s" },
      { rank: "K", suit: "h" },
    ]);
  });

  test("parseCard rejects invalid ranks and suits", () => {
    expect(() => parseCard("1s")).toThrow(/Invalid card/);
    expect(() => parseCard("Qx")).toThrow(/Invalid card/);
  });

  test("parseCardList rejects odd-length strings", () => {
    expect(() => parseCardList("Qs7")).toThrow(/Invalid card list/);
  });

  test("removeKnownCards removes known cards", () => {
    const deck = buildDeck();
    const remaining = removeKnownCards(deck, parseCardList("Qs7s"));
    const remainingIds = remaining.map(cardToString);

    expect(remainingIds).not.toContain("Qs");
    expect(remainingIds).not.toContain("7s");
    expect(remaining).toHaveLength(50);
  });

  test("removeKnownCards rejects duplicate known cards", () => {
    const deck = buildDeck();

    expect(() => removeKnownCards(deck, parseCardList("QsQs"))).toThrow(
      /Duplicate known card/,
    );
  });
});
