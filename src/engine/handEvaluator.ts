import type { Card, Rank, Suit } from "./cards";

export const HAND_CATEGORIES = [
  "high-card",
  "pair",
  "two-pair",
  "trips",
  "straight",
  "flush",
  "full-house",
  "four-kind",
  "straight-flush",
] as const;

export type HandCategory = (typeof HAND_CATEGORIES)[number];
export type OutcomeBucket = "win" | "push" | "miss";

const RANK_VALUES: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function evaluateBestCategory(cards: Card[]): HandCategory {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error("Hand evaluation requires 5 to 7 cards");
  }

  const rankCounts = countBy(cards.map((card) => card.rank));
  const counts = [...rankCounts.values()].sort((a, b) => b - a);

  if (hasStraightFlush(cards)) {
    return "straight-flush";
  }
  if (counts[0] === 4) {
    return "four-kind";
  }
  if (hasFullHouse(counts)) {
    return "full-house";
  }
  if (hasFlush(cards)) {
    return "flush";
  }
  if (hasStraight(cards.map((card) => card.rank))) {
    return "straight";
  }
  if (counts[0] === 3) {
    return "trips";
  }
  if (counts.filter((count) => count >= 2).length >= 2) {
    return "two-pair";
  }
  if (counts[0] === 2) {
    return "pair";
  }

  return "high-card";
}

export function compareCategoryToTarget(
  category: HandCategory,
  target: HandCategory,
): OutcomeBucket {
  const comparison = compareCategories(category, target);

  if (comparison > 0) {
    return "win";
  }
  if (comparison === 0) {
    return "push";
  }
  return "miss";
}

export function compareCategories(left: HandCategory, right: HandCategory): number {
  return HAND_CATEGORIES.indexOf(left) - HAND_CATEGORIES.indexOf(right);
}

function countBy<T>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function hasFullHouse(counts: number[]): boolean {
  const tripCount = counts.filter((count) => count >= 3).length;
  const pairCount = counts.filter((count) => count >= 2).length;

  return tripCount >= 1 && pairCount >= 2;
}

function hasFlush(cards: Card[]): boolean {
  return [...countBy(cards.map((card) => card.suit)).values()].some((count) => count >= 5);
}

function hasStraightFlush(cards: Card[]): boolean {
  const cardsBySuit = new Map<Suit, Card[]>();
  for (const card of cards) {
    cardsBySuit.set(card.suit, [...(cardsBySuit.get(card.suit) ?? []), card]);
  }

  return [...cardsBySuit.values()]
    .filter((suitedCards) => suitedCards.length >= 5)
    .some((suitedCards) => hasStraight(suitedCards.map((card) => card.rank)));
}

function hasStraight(ranks: Rank[]): boolean {
  const values = new Set<number>();
  for (const rank of ranks) {
    const value = RANK_VALUES[rank];
    values.add(value);
    if (rank === "A") {
      values.add(1);
    }
  }

  const sortedValues = [...values].sort((a, b) => a - b);
  let runLength = 1;
  for (let i = 1; i < sortedValues.length; i += 1) {
    if (sortedValues[i] === sortedValues[i - 1] + 1) {
      runLength += 1;
      if (runLength >= 5) {
        return true;
      }
    } else {
      runLength = 1;
    }
  }

  return false;
}
