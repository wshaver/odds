import { buildDeck, removeKnownCards, type Card } from "./cards";
import { compareBestHands } from "./handEvaluator";

export type EnumerateNextCardInput = {
  hero: Card[];
  opponent: Card[];
  board: Card[];
};

export type EnumerationResult = {
  remaining: number;
  win: number;
  push: number;
  miss: number;
  winProbability: number;
  winningCards: Card[];
};

export function enumerateNextCardOutcomes(input: EnumerateNextCardInput): EnumerationResult {
  if (input.hero.length !== 2) {
    throw new Error("Hero must have exactly 2 cards");
  }
  if (input.opponent.length !== 2) {
    throw new Error("Opponent must have exactly 2 cards");
  }
  if (input.board.length !== 3 && input.board.length !== 4) {
    throw new Error("Board must have 3 or 4 cards");
  }

  const knownCards = [...input.hero, ...input.opponent, ...input.board];
  const nextCards = removeKnownCards(buildDeck(), knownCards);
  const result: EnumerationResult = {
    remaining: nextCards.length,
    win: 0,
    push: 0,
    miss: 0,
    winProbability: 0,
    winningCards: [],
  };

  for (const nextCard of nextCards) {
    const board = [...input.board, nextCard];
    const comparison = compareBestHands([...input.hero, ...board], [...input.opponent, ...board]);
    if (comparison > 0) {
      result.win += 1;
      result.winningCards.push(nextCard);
    } else if (comparison === 0) {
      result.push += 1;
    } else {
      result.miss += 1;
    }
  }

  result.winProbability = result.win / result.remaining;
  return result;
}
