import { buildDeck, type Card } from "../engine/cards";
import { enumerateNextCardOutcomes, enumerateNextCardOutcomesFor } from "../engine/enumerator";
import {
  callExpectedValue,
  chaseOutBet,
  maxCorrectCall,
  requiredEquity,
  shouldCall,
} from "../engine/potOdds";
import { COMMON_WIN_CHANCE_OPTIONS } from "./commonWinChanceOptions";
import { createSeededRandom, shuffle } from "./seededRandom";
import type { BetPrompt, ChasePrompt, OddsPrompt, Prompt, PromptMode } from "./types";

export type OddsAnswerModel = {
  kind: "odds";
  correctProbability: number;
  options: number[];
};

export type BetAnswerModel = {
  kind: "bet";
  correctAction: "call" | "fold";
  requiredEquity: number;
  callExpectedValue: number;
};

export type ChaseAnswerModel = {
  kind: "chase";
  correctBet: number;
  highestCorrectCall: number;
  biffWinProbability: number;
  correctBetExpectedValue: number;
  options: number[];
};

export type AnswerModel = OddsAnswerModel | BetAnswerModel | ChaseAnswerModel;

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
export function generatePrompt(mode: "chase", seed?: string): ChasePrompt;
export function generatePrompt(mode: PromptMode, seed?: string): Prompt;
export function generatePrompt(mode: PromptMode, seed = randomSeed()): Prompt {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const prompt = buildPrompt(mode, seedForAttempt(seed, attempt), seed);
    if (isUsefulGeneratedPrompt(prompt)) {
      return prompt;
    }
  }

  for (let attempt = 100; attempt < 1000; attempt += 1) {
    const prompt = buildPrompt(mode, seedForAttempt(seed, attempt), seed);
    if (isUsefulGeneratedPrompt(prompt)) {
      return prompt;
    }
  }

  return buildPrompt(mode, seedForAttempt("ChaseFixture", 1), "ChaseFixture");
}

function buildPrompt(mode: PromptMode, seed: string, potSeed: string): Prompt {
  const compactSeed = compactAlphanumericSeed(seed);
  const potSeedKey = alphanumericSeedKey(potSeed);
  const random = createSeededRandom(compactSeed);
  const cards = shuffle(buildDeck(), `${compactSeed}:cards`);
  const hero = cards.slice(0, 2);
  const opponent = cards.slice(2, 4);
  const boardLength = mode === "bet" || mode === "chase" || random() < 0.5 ? 4 : 3;
  const board = cards.slice(4, 4 + boardLength);

  if (mode === "odds") {
    return {
      mode,
      hero,
      opponent,
      board,
      seed: compactSeed,
    } satisfies OddsPrompt;
  }

  const pot = normalizedPot(potSeedKey);

  if (mode === "chase") {
    return {
      mode,
      hero,
      opponent,
      board,
      pot,
      seed: compactSeed,
    } satisfies ChasePrompt;
  }

  const call = positiveChipAmount(random, 1, 16, 5);

  return {
    mode,
    hero,
    opponent,
    board,
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
export function getAnswerModel(prompt: ChasePrompt): ChaseAnswerModel;
export function getAnswerModel(prompt: Prompt): AnswerModel;
export function getAnswerModel(prompt: Prompt): AnswerModel {
  const correctProbability = enumerateNextCardOutcomes(prompt).winProbability;

  if (prompt.mode === "odds") {
    return {
      kind: "odds",
      correctProbability,
      options: oddsOptions(correctProbability, prompt.seed),
    };
  }

  if (prompt.mode === "chase") {
    const outcomes = enumerateNextCardOutcomesFor({
      subject: prompt.opponent,
      opponent: prompt.hero,
      board: prompt.board,
    });
    const correctBet = chaseOutBet({
      pot: prompt.pot,
      winProbability: outcomes.winProbability,
    });

    if (correctBet === null) {
      throw new Error("Chase prompt has no finite chase-out bet");
    }

    return {
      kind: "chase",
      correctBet,
      highestCorrectCall: maxCorrectCall({
        pot: prompt.pot,
        winProbability: outcomes.winProbability,
      }),
      biffWinProbability: outcomes.winProbability,
      correctBetExpectedValue: callExpectedValue({
        pot: prompt.pot,
        call: correctBet,
        winProbability: outcomes.winProbability,
      }),
      options: chaseOptions(correctBet, prompt.seed),
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
    callExpectedValue: callExpectedValue({
      pot: prompt.pot,
      call: prompt.call,
      winProbability: correctProbability,
    }),
  };
}

export function promptSignature(prompt: Prompt): string {
  const cards = [...prompt.hero, ...prompt.opponent, ...prompt.board]
    .map((card) => `${card.rank}${card.suit}`)
    .join("");

  if (prompt.mode === "odds") {
    return `odds:${cards}:${prompt.seed}`;
  }

  if (prompt.mode === "chase") {
    return `chase:${cards}:${prompt.pot}:${prompt.seed}`;
  }

  return `bet:${cards}:${prompt.pot}:${prompt.call}:${prompt.seed}`;
}

function isUsefulGeneratedPrompt(prompt: Prompt): boolean {
  if (prompt.mode !== "chase") {
    const outcomes = enumerateNextCardOutcomes(prompt);
    return outcomes.win > 0 && outcomes.win < outcomes.remaining;
  }

  const biffOutcomes = enumerateNextCardOutcomesFor({
    subject: prompt.opponent,
    opponent: prompt.hero,
    board: prompt.board,
  });
  const correctBet = chaseOutBet({
    pot: prompt.pot,
    winProbability: biffOutcomes.winProbability,
  });

  return (
    biffOutcomes.win > 0 &&
    biffOutcomes.win < biffOutcomes.remaining &&
    correctBet !== null &&
    correctBet > 1 &&
    correctBet <= prompt.pot * 5
  );
}

function oddsOptions(correctProbability: number, seed: string): number[] {
  const correct = roundProbability(correctProbability);
  const random = createSeededRandom(`${seed}:odds-options`);
  const options = new Set<number>([correct]);
  const commonOptions = shuffle([...COMMON_WIN_CHANCE_OPTIONS], seed);

  for (const option of commonOptions) {
    if (options.size === 3) {
      break;
    }
    options.add(option);
  }

  while (options.size < 3) {
    options.add(clampProbability(roundProbability(random())));
  }

  return shuffle([...options], `${seed}:odds-options-order`);
}

function chaseOptions(correctBet: number, seed: string): number[] {
  const random = createSeededRandom(`${seed}:chase-options`);
  const rankPattern = seed.charCodeAt(seed.length - 1) % 3;
  const nearStep = Math.max(1, Math.round(correctBet * (0.15 + random() * 0.1)));
  const farStep = Math.max(nearStep + 1, Math.round(correctBet * (0.3 + random() * 0.15)));
  const options = new Set<number>();

  if (rankPattern === 0) {
    addPositiveOptions(options, [correctBet, correctBet + nearStep, correctBet + farStep]);
  } else if (rankPattern === 1) {
    addPositiveOptions(options, [correctBet - nearStep, correctBet, correctBet + nearStep]);
  } else {
    addPositiveOptions(options, [correctBet - farStep, correctBet - nearStep, correctBet]);
  }

  for (let offset = 1; options.size < 3; offset += 1) {
    addPositiveOptions(options, [
      correctBet - offset,
      correctBet + offset,
      correctBet + nearStep + offset,
    ]);
  }

  return shuffle([...options], `${seed}:chase-options-order`);
}

function addPositiveOptions(options: Set<number>, values: number[]): void {
  for (const value of values) {
    if (value > 0) {
      options.add(value);
    }
  }
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

function normalizedPot(seed: string): number {
  return (10 + (stableHash(`${seed}:pot`) % 21)) * 5;
}

function stableHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash;
}

function compactAlphanumericSeed(seed: string): string {
  const compact = alphanumericSeedKey(seed);
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

function alphanumericSeedKey(seed: string): string {
  return seed.replace(/[^A-Za-z0-9]/g, "");
}
