import { buildDeck, type Card } from "../engine/cards";
import { enumerateNextCardOutcomes } from "../engine/enumerator";
import type { HandCategory } from "../engine/handEvaluator";
import { requiredEquity, shouldCall } from "../engine/potOdds";
import { createSeededRandom, shuffle } from "./seededRandom";
import type { BetPrompt, OddsPrompt, Prompt, PromptMode } from "./types";

export type OddsAnswerModel = {
  kind: "odds";
  correctProbability: number;
  options: number[];
};

export type BetAnswerModel = {
  kind: "bet";
  correctAction: "call" | "fold";
  requiredEquity: number;
};

export type AnswerModel = OddsAnswerModel | BetAnswerModel;

const USEFUL_TARGETS: HandCategory[] = [
  "pair",
  "two-pair",
  "trips",
  "straight",
  "flush",
  "full-house",
];

const SEED_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function randomSeed(): string {
  let seed = "";
  for (let i = 0; i < 8; i += 1) {
    seed += SEED_ALPHABET[Math.floor(Math.random() * SEED_ALPHABET.length)];
  }
  return seed;
}

export function generatePrompt(mode: "odds", seed?: string): OddsPrompt;
export function generatePrompt(mode: "bet", seed?: string): BetPrompt;
export function generatePrompt(mode: PromptMode, seed?: string): Prompt;
export function generatePrompt(mode: PromptMode, seed = randomSeed()): Prompt {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const prompt = buildPrompt(mode, seedForAttempt(seed, attempt));
    if (enumerateNextCardOutcomes(prompt).win > 0) {
      return prompt;
    }
  }

  return buildPrompt(mode, seedForAttempt(seed, 100));
}

function buildPrompt(mode: PromptMode, seed: string): Prompt {
  const compactSeed = compactAlphanumericSeed(seed);
  const random = createSeededRandom(compactSeed);
  const cards = shuffle(buildDeck(), `${compactSeed}:cards`);
  const hero = cards.slice(0, 2);
  const boardLength = mode === "bet" || random() < 0.5 ? 4 : 3;
  const board = cards.slice(2, 2 + boardLength);
  const target = USEFUL_TARGETS[Math.floor(random() * USEFUL_TARGETS.length)];

  if (mode === "odds") {
    return {
      mode,
      hero,
      board,
      target,
      seed: compactSeed,
    } satisfies OddsPrompt;
  }

  const pot = positiveChipAmount(random, 4, 40, 5);
  const call = positiveChipAmount(random, 1, 16, 5);

  return {
    mode,
    hero,
    board,
    target,
    pot,
    call,
    seed: compactSeed,
  } satisfies BetPrompt;
}

function seedForAttempt(seed: string, attempt: number): string {
  if (attempt === 0) {
    return seed;
  }

  const suffix = String(attempt);
  const base = compactAlphanumericSeed(seed).slice(0, 12 - suffix.length);
  return `${base}${suffix}`;
}

export function getAnswerModel(prompt: OddsPrompt): OddsAnswerModel;
export function getAnswerModel(prompt: BetPrompt): BetAnswerModel;
export function getAnswerModel(prompt: Prompt): AnswerModel {
  const correctProbability = enumerateNextCardOutcomes(prompt).winProbability;

  if (prompt.mode === "odds") {
    return {
      kind: "odds",
      correctProbability,
      options: oddsOptions(correctProbability, prompt.seed),
    };
  }

  return {
    kind: "bet",
    correctAction: shouldCall({
      pot: prompt.pot,
      call: prompt.call,
      winProbability: correctProbability,
    })
      ? "call"
      : "fold",
    requiredEquity: requiredEquity(prompt.pot, prompt.call),
  };
}

export function promptSignature(prompt: Prompt): string {
  const cards = [...prompt.hero, ...prompt.board]
    .map((card) => `${card.rank}${card.suit}`)
    .join("");

  if (prompt.mode === "odds") {
    return `odds:${cards}:${prompt.target}:${prompt.seed}`;
  }

  return `bet:${cards}:${prompt.target}:${prompt.pot}:${prompt.call}:${prompt.seed}`;
}

function oddsOptions(correctProbability: number, seed: string): number[] {
  const correct = roundProbability(correctProbability);
  const random = createSeededRandom(`${seed}:odds-options`);
  const options = new Set<number>([correct]);
  const deltas = shuffle([0.1, -0.1, 0.2, -0.2, 0.3, -0.3, 0.15, -0.15], seed);

  for (const delta of deltas) {
    if (options.size === 3) {
      break;
    }
    options.add(clampProbability(roundProbability(correct + delta)));
  }

  while (options.size < 3) {
    options.add(roundProbability(random()));
  }

  return shuffle([...options], `${seed}:odds-options-order`);
}

function roundProbability(value: number): number {
  return Number(value.toFixed(2));
}

function clampProbability(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function positiveChipAmount(
  random: () => number,
  minUnits: number,
  maxUnits: number,
  unitSize: number,
): number {
  return (minUnits + Math.floor(random() * (maxUnits - minUnits + 1))) * unitSize;
}

function compactAlphanumericSeed(seed: string): string {
  const compact = seed.replace(/[^A-Za-z0-9]/g, "");
  if (compact.length > 0) {
    return compact.slice(0, 12);
  }

  const random = createSeededRandom(seed);
  let fallback = "";
  for (let i = 0; i < 8; i += 1) {
    fallback += SEED_ALPHABET[Math.floor(random() * SEED_ALPHABET.length)];
  }
  return fallback;
}
