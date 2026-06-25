import { describe, expect, test } from "vitest";

import { cardToString } from "../engine/cards";
import { canonicalPromptKey, parsePromptHash, promptToHash } from "./hashRouter";

describe("hashRouter", () => {
  test("parses odds hash into prompt fields", () => {
    const prompt = parsePromptHash(
      "#/odds?hero=6s7s&opponent=TdTc&board=8s9dKh&seed=k4p9",
    );

    expect(prompt.mode).toBe("odds");
    expect(prompt.hero.map(cardToString)).toEqual(["6s", "7s"]);
    expect(prompt.opponent.map(cardToString)).toEqual(["Td", "Tc"]);
    expect(prompt.board.map(cardToString)).toEqual(["8s", "9d", "Kh"]);
    expect(prompt.seed).toBe("k4p9");
  });

  test("parses bet hash into prompt fields", () => {
    const prompt = parsePromptHash(
      "#/bet?hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&call=30&seed=k4p9",
    );

    expect(prompt.mode).toBe("bet");
    if (prompt.mode !== "bet") {
      throw new Error("Expected bet prompt");
    }
    expect(prompt.pot).toBe(120);
    expect(prompt.call).toBe(30);
  });

  test("parses chase hash into prompt fields", () => {
    const prompt = parsePromptHash(
      "#/chase?hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&seed=k4p9",
    );

    expect(prompt.mode).toBe("chase");
    if (prompt.mode !== "chase") {
      throw new Error("Expected chase prompt");
    }
    expect(prompt.hero.map(cardToString)).toEqual(["6s", "7s"]);
    expect(prompt.opponent.map(cardToString)).toEqual(["Td", "Tc"]);
    expect(prompt.board.map(cardToString)).toEqual(["8s", "9d", "Kh", "2s"]);
    expect(prompt.pot).toBe(120);
    expect(prompt.seed).toBe("k4p9");
  });

  test("rejects duplicate cards", () => {
    expect(() =>
      parsePromptHash("#/odds?hero=6s7s&opponent=TdTc&board=8s9d6s&seed=k4p9"),
    ).toThrow(/Duplicate card/);
  });

  test("rejects invalid board lengths", () => {
    expect(() =>
      parsePromptHash("#/odds?hero=6s7s&opponent=TdTc&board=8s9d&seed=k4p9"),
    ).toThrow(/Odds mode requires 3 or 4 board cards/);

    expect(() =>
      parsePromptHash(
        "#/bet?hero=6s7s&opponent=TdTc&board=8s9dKh&pot=120&call=30&seed=k4p9",
      ),
    ).toThrow(/Bet mode requires exactly 4 board cards/);

    expect(() =>
      parsePromptHash(
        "#/chase?hero=6s7s&opponent=TdTc&board=8s9dKh&pot=120&seed=k4p9",
      ),
    ).toThrow(/Chase mode requires exactly 4 board cards/);
  });

  test("round trips bet prompt hash and canonical key", () => {
    const hash = "#/bet?hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&call=30&seed=k4p9";
    const prompt = parsePromptHash(hash);

    expect(promptToHash(prompt)).toBe(hash);
    expect(canonicalPromptKey(prompt)).toBe(
      "mode=bet&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&call=30&seed=k4p9",
    );
  });

  test("round trips chase prompt hash and canonical key", () => {
    const hash = "#/chase?hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&seed=k4p9";
    const prompt = parsePromptHash(hash);

    expect(promptToHash(prompt)).toBe(hash);
    expect(canonicalPromptKey(prompt)).toBe(
      "mode=chase&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&seed=k4p9",
    );
  });

  test("rejects non-whole-dollar chase pots", () => {
    expect(() =>
      parsePromptHash(
        "#/chase?hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120.5&seed=k4p9",
      ),
    ).toThrow(/Pot must be a positive whole dollar amount/);
  });

  test("encodes special characters in seed and parses them back", () => {
    const prompt = parsePromptHash(
      "#/odds?hero=6s7s&opponent=TdTc&board=8s9dKh&seed=k4p9",
    );

    const hash = promptToHash({ ...prompt, seed: "a&pot=999#x y" });

    expect(hash).toBe(
      "#/odds?hero=6s7s&opponent=TdTc&board=8s9dKh&seed=a%26pot%3D999%23x%20y",
    );
    expect(parsePromptHash(hash).seed).toBe("a&pot=999#x y");
  });

  test("canonical prompt keys encode special-character seeds without ambiguity", () => {
    const prompt = parsePromptHash(
      "#/bet?hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&call=30&seed=k4p9",
    );

    expect(canonicalPromptKey({ ...prompt, seed: "a&pot=999#x y" })).toBe(
      "mode=bet&hero=6s7s&opponent=TdTc&board=8s9dKh2s&pot=120&call=30&seed=a%26pot%3D999%23x%20y",
    );
  });

  test("rejects duplicate known prompt parameters", () => {
    expect(() =>
      parsePromptHash(
        "#/odds?hero=6s7s&hero=AsAd&opponent=TdTc&board=8s9dKh&seed=k4p9",
      ),
    ).toThrow(/Duplicate parameter: hero/);
  });

  test("rejects legacy target-only hashes", () => {
    expect(() =>
      parsePromptHash("#/odds?hero=6s7s&board=8s9dKh&target=two-pair&seed=k4p9"),
    ).toThrow(/Missing opponent/);
  });
});
