import { describe, expect, test } from "vitest";

import { cardToString } from "../engine/cards";
import { enumerateNextCardOutcomes } from "../engine/enumerator";
import { requiredEquity, shouldCall } from "../engine/potOdds";
import { parsePromptHash, promptToHash } from "./hashRouter";
import { COMMON_WIN_CHANCE_OPTIONS } from "./commonWinChanceOptions";
import { generatePrompt, getAnswerModel } from "./questionGenerator";

function cardIds(prompt: ReturnType<typeof generatePrompt>): string[] {
  return [...prompt.hero, ...prompt.opponent, ...prompt.board].map(cardToString);
}

function roundedProbability(value: number): number {
  return Number(value.toFixed(2));
}

describe("questionGenerator", () => {
  test("generates valid odds prompts with compact seed", () => {
    const prompt = generatePrompt("odds", "Seed42");

    expect(prompt.mode).toBe("odds");
    expect(prompt.hero).toHaveLength(2);
    expect(prompt.opponent).toHaveLength(2);
    expect([3, 4]).toContain(prompt.board.length);
    expect(prompt.seed).toMatch(/^[A-Za-z0-9]+$/);
    expect(parsePromptHash(promptToHash(prompt))).toEqual(prompt);
  });

  test("generates valid bet prompts with 4-card board and positive pot/call", () => {
    const prompt = generatePrompt("bet", "Bet42");

    expect(prompt.mode).toBe("bet");
    expect(prompt.hero).toHaveLength(2);
    expect(prompt.opponent).toHaveLength(2);
    expect(prompt.board).toHaveLength(4);
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

  test("generated prompts in both modes have at least one winning next card", () => {
    for (const mode of ["odds", "bet"] as const) {
      for (let index = 0; index < 200; index += 1) {
        const prompt = generatePrompt(mode, `ZeroWin${mode}${index}`);

        expect(
          enumerateNextCardOutcomes(prompt).win,
          `${mode} seed ${prompt.seed}`,
        ).toBeGreaterThan(0);
      }
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

  test("stores all observed common non-zero rounded win chance options", () => {
    expect(COMMON_WIN_CHANCE_OPTIONS.length).toBeGreaterThan(0);
    expect(COMMON_WIN_CHANCE_OPTIONS.length).toBeLessThan(100);
    expect(new Set(COMMON_WIN_CHANCE_OPTIONS).size).toBe(COMMON_WIN_CHANCE_OPTIONS.length);
    expect(COMMON_WIN_CHANCE_OPTIONS.every((option) => option > 0 && option <= 1)).toBe(true);
    expect(
      COMMON_WIN_CHANCE_OPTIONS.every((option) => Number(option.toFixed(2)) === option),
    ).toBe(true);
  });

  test("odds answer distractors use stored common win chances", () => {
    const prompt = generatePrompt("odds", "CommonOptions99");
    const answer = getAnswerModel(prompt);
    const correct = roundedProbability(enumerateNextCardOutcomes(prompt).winProbability);

    expect(answer.kind).toBe("odds");
    expect(answer.options).toContain(correct);
    expect(
      answer.options
        .filter((option) => option !== correct)
        .every((option) => COMMON_WIN_CHANCE_OPTIONS.includes(option)),
    ).toBe(true);
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
