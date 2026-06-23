import { describe, expect, test } from "vitest";

import { cardToString } from "../engine/cards";
import { enumerateNextCardOutcomes } from "../engine/enumerator";
import { requiredEquity, shouldCall } from "../engine/potOdds";
import { parsePromptHash, promptToHash } from "./hashRouter";
import { generatePrompt, getAnswerModel } from "./questionGenerator";

const USEFUL_TARGETS = new Set([
  "pair",
  "two-pair",
  "trips",
  "straight",
  "flush",
  "full-house",
]);

function cardIds(prompt: ReturnType<typeof generatePrompt>): string[] {
  return [...prompt.hero, ...prompt.board].map(cardToString);
}

function roundedProbability(value: number): number {
  return Number(value.toFixed(2));
}

describe("questionGenerator", () => {
  test("generates valid odds prompts with compact seed", () => {
    const prompt = generatePrompt("odds", "Seed42");

    expect(prompt.mode).toBe("odds");
    expect(prompt.hero).toHaveLength(2);
    expect([3, 4]).toContain(prompt.board.length);
    expect(USEFUL_TARGETS.has(prompt.target)).toBe(true);
    expect(prompt.seed).toMatch(/^[A-Za-z0-9]+$/);
    expect(parsePromptHash(promptToHash(prompt))).toEqual(prompt);
  });

  test("generates valid bet prompts with 4-card board and positive pot/call", () => {
    const prompt = generatePrompt("bet", "Bet42");

    expect(prompt.mode).toBe("bet");
    expect(prompt.hero).toHaveLength(2);
    expect(prompt.board).toHaveLength(4);
    expect(USEFUL_TARGETS.has(prompt.target)).toBe(true);
    expect(prompt.seed).toMatch(/^[A-Za-z0-9]+$/);
    expect(prompt.pot).toBeGreaterThan(0);
    expect(prompt.call).toBeGreaterThan(0);
    expect(parsePromptHash(promptToHash(prompt))).toEqual(prompt);
  });

  test("generated prompts have no duplicate cards", () => {
    for (const mode of ["odds", "bet"] as const) {
      const prompt = generatePrompt(mode, `NoDupes${mode}`);
      const ids = cardIds(prompt);

      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test("creates stable odds answer options from the prompt seed", () => {
    const prompt = generatePrompt("odds", "Stable99");

    expect(getAnswerModel(prompt)).toEqual(getAnswerModel(prompt));
  });

  test("answer model odds match enumeration exactly for correctProbability", () => {
    const prompt = generatePrompt("odds", "Enum99");
    const answer = getAnswerModel(prompt);

    expect(answer.kind).toBe("odds");
    expect(answer.correctProbability).toBe(
      enumerateNextCardOutcomes(prompt).winProbability,
    );
  });

  test("odds answer options have length 3 and include rounded correct probability", () => {
    const prompt = generatePrompt("odds", "Opts99");
    const answer = getAnswerModel(prompt);
    const correctProbability = enumerateNextCardOutcomes(prompt).winProbability;

    expect(answer.kind).toBe("odds");
    expect(answer.options).toHaveLength(3);
    expect(answer.options.every((option) => typeof option === "number")).toBe(true);
    expect(answer.options).toContain(roundedProbability(correctProbability));
  });

  test("bet answer model matches shouldCall/requiredEquity", () => {
    const prompt = generatePrompt("bet", "Call99");
    const answer = getAnswerModel(prompt);
    const winProbability = enumerateNextCardOutcomes(prompt).winProbability;

    expect(answer.kind).toBe("bet");
    expect(answer.requiredEquity).toBe(requiredEquity(prompt.pot, prompt.call));
    expect(answer.correctAction).toBe(
      shouldCall({ pot: prompt.pot, call: prompt.call, winProbability })
        ? "call"
        : "fold",
    );
  });
});
