import { buildDeck, removeKnownCards, type Card } from "./cards";
import {
  compareCategories,
  compareCategoryToTarget,
  evaluateBestCategory,
  type HandCategory,
} from "./handEvaluator";

export type EnumerateNextCardInput = {
  hero: Card[];
  board: Card[];
  target: HandCategory;
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
  if (input.board.length !== 3 && input.board.length !== 4) {
    throw new Error("Board must have 3 or 4 cards");
  }

  const knownCards = [...input.hero, ...input.board];
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
    const category = evaluateBestCategory([...knownCards, nextCard]);
    const boardCategory =
      input.board.length === 4 ? evaluateBestCategory([...input.board, nextCard]) : null;
    const outcome = classifyOutcome(category, boardCategory, input.target);
    result[outcome] += 1;
    if (outcome === "win") {
      result.winningCards.push(nextCard);
    }
  }

  result.winProbability = result.win / result.remaining;
  return result;
}

function classifyOutcome(
  heroCategory: HandCategory,
  boardCategory: HandCategory | null,
  target: HandCategory,
): "win" | "push" | "miss" {
  const heroOutcome = compareCategoryToTarget(heroCategory, target);

  if (
    heroOutcome === "win" &&
    boardCategory !== null &&
    compareCategoryToTarget(boardCategory, target) === "win" &&
    compareCategories(heroCategory, boardCategory) <= 0
  ) {
    return "push";
  }

  return heroOutcome;
}
