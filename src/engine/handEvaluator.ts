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
export type HandScore = {
  category: HandCategory;
  ranks: number[];
};

type RankGroup = {
  rank: Rank;
  value: number;
  count: number;
};

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
  return evaluateBestHand(cards).category;
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

export function compareBestHands(left: Card[], right: Card[]): number {
  return compareHandScores(evaluateBestHand(left), evaluateBestHand(right));
}

export function evaluateBestHand(cards: Card[]): HandScore {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error("Hand evaluation requires 5 to 7 cards");
  }

  let best: HandScore | null = null;
  for (const hand of fiveCardCombinations(cards)) {
    const score = evaluateFiveCardHand(hand);
    if (best === null || compareHandScores(score, best) > 0) {
      best = score;
    }
  }

  if (best === null) {
    throw new Error("Hand evaluation requires 5 to 7 cards");
  }

  return best;
}

export function compareHandScores(left: HandScore, right: HandScore): number {
  const categoryComparison = compareCategories(left.category, right.category);
  if (categoryComparison !== 0) {
    return categoryComparison;
  }

  const length = Math.max(left.ranks.length, right.ranks.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left.ranks[index] ?? 0) - (right.ranks[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
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
  return straightHighValue(ranks) !== null;
}

function evaluateFiveCardHand(cards: Card[]): HandScore {
  const flush = hasFlush(cards);
  const straightHigh = straightHighValue(cards.map((card) => card.rank));
  const groups = rankGroups(cards);

  if (flush && straightHigh !== null) {
    return { category: "straight-flush", ranks: [straightHigh] };
  }

  const four = groups.find((group) => group.count === 4);
  if (four !== undefined) {
    return {
      category: "four-kind",
      ranks: [
        four.value,
        ...groups.filter((group) => group.count !== 4).map((group) => group.value),
      ],
    };
  }

  const counts = groups.map((group) => group.count).sort((a, b) => b - a);
  if (hasFullHouse(counts)) {
    const trips = groups.filter((group) => group.count >= 3);
    const pairs = groups.filter((group) => group.count >= 2 && group.value !== trips[0].value);
    return { category: "full-house", ranks: [trips[0].value, pairs[0].value] };
  }

  if (flush) {
    return { category: "flush", ranks: groups.map((group) => group.value) };
  }

  if (straightHigh !== null) {
    return { category: "straight", ranks: [straightHigh] };
  }

  const trips = groups.find((group) => group.count === 3);
  if (trips !== undefined) {
    return {
      category: "trips",
      ranks: [
        trips.value,
        ...groups.filter((group) => group.count !== 3).map((group) => group.value),
      ],
    };
  }

  const pairs = groups.filter((group) => group.count === 2);
  if (pairs.length >= 2) {
    return {
      category: "two-pair",
      ranks: [
        pairs[0].value,
        pairs[1].value,
        groups.filter((group) => group.count === 1)[0].value,
      ],
    };
  }

  if (pairs.length === 1) {
    return {
      category: "pair",
      ranks: [
        pairs[0].value,
        ...groups.filter((group) => group.count === 1).map((group) => group.value),
      ],
    };
  }

  return { category: "high-card", ranks: groups.map((group) => group.value) };
}

function fiveCardCombinations(cards: Card[]): Card[][] {
  const combinations: Card[][] = [];
  for (let first = 0; first < cards.length - 4; first += 1) {
    for (let second = first + 1; second < cards.length - 3; second += 1) {
      for (let third = second + 1; third < cards.length - 2; third += 1) {
        for (let fourth = third + 1; fourth < cards.length - 1; fourth += 1) {
          for (let fifth = fourth + 1; fifth < cards.length; fifth += 1) {
            combinations.push([cards[first], cards[second], cards[third], cards[fourth], cards[fifth]]);
          }
        }
      }
    }
  }
  return combinations;
}

function rankGroups(cards: Card[]): RankGroup[] {
  const counts = countBy(cards.map((card) => card.rank));
  return [...counts.entries()]
    .map(([rank, count]) => ({ rank, value: RANK_VALUES[rank], count }))
    .sort((left, right) => right.count - left.count || right.value - left.value);
}

function straightHighValue(ranks: Rank[]): number | null {
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
  let best: number | null = null;
  for (let index = 1; index < sortedValues.length; index += 1) {
    if (sortedValues[index] === sortedValues[index - 1] + 1) {
      runLength += 1;
      if (runLength >= 5) {
        best = sortedValues[index];
      }
    } else {
      runLength = 1;
    }
  }

  return best;
}
