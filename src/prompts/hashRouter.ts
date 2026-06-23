import { cardToString, parseCardList, type Card } from "../engine/cards";
import { HAND_CATEGORIES, type HandCategory } from "../engine/handEvaluator";
import type { BetPrompt, OddsPrompt, Prompt, PromptMode } from "./types";

export function parsePromptHash(hash: string): Prompt {
  const match = hash.match(/^#\/([^?]+)\?(.*)$/);
  if (!match) {
    throw new Error("Invalid prompt hash");
  }

  const mode = parseMode(match[1]);
  const params = new URLSearchParams(match[2]);
  validateNoDuplicateParams(params, knownParamsForMode(mode));
  const hero = parseCards(requireParam(params, "hero"), "hero");
  const board = parseCards(requireParam(params, "board"), "board");
  const target = parseTarget(requireParam(params, "target"));
  const seed = requireParam(params, "seed");

  validateHero(hero);
  validateBoard(mode, board);
  validateNoDuplicateCards([...hero, ...board]);

  if (mode === "odds") {
    return { mode, hero, board, target, seed } satisfies OddsPrompt;
  }

  return {
    mode,
    hero,
    board,
    target,
    pot: parsePositiveNumber(requireParam(params, "pot"), "Pot"),
    call: parsePositiveNumber(requireParam(params, "call"), "Call"),
    seed,
  } satisfies BetPrompt;
}

export function promptToHash(prompt: Prompt): string {
  if (prompt.mode === "odds") {
    return `#/odds?${serializeParams([
      ["hero", cardsToString(prompt.hero)],
      ["board", cardsToString(prompt.board)],
      ["target", prompt.target],
      ["seed", prompt.seed],
    ])}`;
  }

  return `#/bet?${serializeParams([
    ["hero", cardsToString(prompt.hero)],
    ["board", cardsToString(prompt.board)],
    ["target", prompt.target],
    ["pot", String(prompt.pot)],
    ["call", String(prompt.call)],
    ["seed", prompt.seed],
  ])}`;
}

export function canonicalPromptKey(prompt: Prompt): string {
  if (prompt.mode === "odds") {
    return serializeParams([
      ["mode", "odds"],
      ["hero", cardsToString(prompt.hero)],
      ["board", cardsToString(prompt.board)],
      ["target", prompt.target],
      ["seed", prompt.seed],
    ]);
  }

  return serializeParams([
    ["mode", "bet"],
    ["hero", cardsToString(prompt.hero)],
    ["board", cardsToString(prompt.board)],
    ["target", prompt.target],
    ["pot", String(prompt.pot)],
    ["call", String(prompt.call)],
    ["seed", prompt.seed],
  ]);
}

function parseMode(value: string): PromptMode {
  if (value === "odds" || value === "bet") {
    return value;
  }

  throw new Error(`Unknown mode: ${value}`);
}

function requireParam(params: URLSearchParams, key: string): string {
  const value = params.get(key);
  if (value === null || value === "") {
    throw new Error(`Missing ${key}`);
  }
  return value;
}

function knownParamsForMode(mode: PromptMode): string[] {
  if (mode === "odds") {
    return ["hero", "board", "target", "seed"];
  }

  return ["hero", "board", "target", "pot", "call", "seed"];
}

function validateNoDuplicateParams(params: URLSearchParams, knownParams: string[]): void {
  for (const key of knownParams) {
    if (params.getAll(key).length > 1) {
      throw new Error(`Duplicate parameter: ${key}`);
    }
  }
}

function parseCards(value: string, key: string): Card[] {
  try {
    return parseCardList(value);
  } catch (error) {
    throw new Error(`Invalid ${key}: ${(error as Error).message}`);
  }
}

function parseTarget(value: string): HandCategory {
  if (HAND_CATEGORIES.includes(value as HandCategory)) {
    return value as HandCategory;
  }

  throw new Error(`Invalid target: ${value}`);
}

function validateHero(hero: Card[]): void {
  if (hero.length !== 2) {
    throw new Error("Prompt requires exactly 2 hero cards");
  }
}

function validateBoard(mode: PromptMode, board: Card[]): void {
  if (mode === "odds" && board.length !== 3 && board.length !== 4) {
    throw new Error("Odds mode requires 3 or 4 board cards");
  }

  if (mode === "bet" && board.length !== 4) {
    throw new Error("Bet mode requires exactly 4 board cards");
  }
}

function validateNoDuplicateCards(cards: Card[]): void {
  const seen = new Set<string>();
  for (const card of cards) {
    const id = cardToString(card);
    if (seen.has(id)) {
      throw new Error(`Duplicate card: ${id}`);
    }
    seen.add(id);
  }
}

function parsePositiveNumber(value: string, label: "Pot" | "Call"): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be positive`);
  }

  return parsed;
}

function cardsToString(cards: Card[]): string {
  return cards.map(cardToString).join("");
}

function serializeParams(entries: [string, string][]): string {
  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}
